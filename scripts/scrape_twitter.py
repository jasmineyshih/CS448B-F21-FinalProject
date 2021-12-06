import tweepy
import threading, queue, time, datetime
import sys
import json


class Controller:
    """
    Controls all processor and scraper threads
    """
    def __init__(self, tag, from_date, output_file) -> None:
        self.consumer_key = "kEHSuoqKADFP5KK0X5EZ2HzaW"
        self.consumer_secret = "Xd3YrIo1gDj4aFeaxlfWwVP0CS6x4KyesMXrTtFxB8MnXieEHt"
        self.access_token = "2328202038-0Sm5cVuNianmAmiBCLhNcHsNmbWtMIwxfrPLyzQ"
        self.access_token_secret = "91REr5tTCdvm5tK7O3WTZaQqQIFHPjEb87ldgSj9iOY4U"
        self.sandbox_label = "research"
        self.tweet_queue = queue.Queue(-1)
        self.from_date = from_date
        auth = tweepy.OAuthHandler(self.consumer_key, self.consumer_secret)
        auth.set_access_token(self.access_token, self.access_token_secret)
        self.api = tweepy.API(auth)
        self.tag = tag
        self.friend_follower_queue = queue.Queue(-1)
        self.id_queue = queue.Queue(-1)
        self.posters_list = []
        self.final_data = {'nodes':[], 'links':[]}
        self.output_file = output_file

    def get_data(self):
        tweet_query = {'type': 'tweets', 'tag':self.tag, 'from_date': self.from_date, 'label': self.sandbox_label}
        tweet_scraper = Scraper(self.api, self.tweet_queue, tweet_query, self.output_file, self.final_data, self.id_queue, self.posters_list)
        tweet_scraper.start()

        ff_query = {'type': 'ff', 'id_list': self.id_queue}
        ff_scraper = Scraper(self.api, self.friend_follower_queue, ff_query, self.output_file, self.final_data, self.id_queue, self.posters_list)
        ff_scraper.start()

        tweet_scraper.join()
        ff_scraper.setKillFlag(True)
        ff_scraper.join()

        link_processor = LinkProcessor(self.friend_follower_queue, self.final_data, self.posters_list)
        link_processor.start()
        link_processor.setKillFlag(True)
        link_processor.join()

        with open(self.output_file+".json", 'w') as outfile:
            json.dump(self.final_data, outfile, indent=4)


class Scraper(threading.Thread):
    """
    This class scrapes data from Twitter and stores it in shared queue for further processing
    Multithreaded so that it can execute independently as per Twitter limit regulations
    """
    def __init__(self, api, item_queue, query, output_file, node_links, posters, posters_list) -> None:
        threading.Thread.__init__(self)
        self.query = query
        self.item_queue = item_queue
        self.api = api
        self.kill_flag = False
        self.output_file = output_file
        self.nodes_links = node_links
        self.posters = posters
        self.posters_list = posters_list

    
    def extract_tweets(self):
        cursor = tweepy.Cursor(self.api.search_30_day, 
                                label=self.query['label'], 
                                query = self.query['tag'], 
                                fromDate = self.query['from_date'])

        tweets = cursor.items()
        try:
            for tweet in tweets:
                self.item_queue.put(tweet, block=False)
                data = {
                    "tweet": tweet.text,
                    "id": tweet.user.id,
                    "timestamp": int(datetime.datetime.timestamp(tweet.created_at)*1000),
                    "numLikes": tweet.favorite_count,
                    "numComments": tweet.retweet_count,
                    "numFollowers": tweet.user.followers_count,
                    "numFollowings": tweet.user.friends_count
                }
                self.nodes_links['nodes'].append(data)
                self.posters.put(tweet.user.id, block=False)
                self.posters_list.append(tweet.user.id)
                with open(self.output_file+"_tweets.json", 'a') as tweets_file:
                    json.dump(data, tweets_file, indent=4)
                    tweets_file.write(',\n')
                with open(self.output_file+"_posters.json", 'a') as posters_file:
                    json.dump({'serial': len(self.posters_list), 'id': tweet.user.id}, posters_file, indent=4)
                    posters_file.write(',\n')
        except:
            print("API error, waiting for 2 mins before making next tweet request")
            time.sleep(120)

        print("Scraper thread finished scraping "+self.query['type'])

    def get_followers_following(self):
        extracted_curr_user_info = True
        user_id = None
        is_get_error = False
        while True:
            if self.kill_flag and self.query['id_list'].qsize()==0:
                break
            if extracted_curr_user_info:
                try:
                    user_id = self.query['id_list'].get(block=False)
                    is_get_error = False
                except:
                    is_get_error = True
            if not is_get_error:
                try:
                    cursor1 = tweepy.Cursor(self.api.get_follower_ids, user_id = user_id).items()
                    followers = list(cursor1)
                    cursor2 = tweepy.Cursor(self.api.get_friend_ids, user_id = user_id).items()
                    followings = list(cursor2)
                    data = {
                        'id': user_id,
                        'followers': followers,
                        'followings': followings
                    }
                    self.item_queue.put(data, block=False)
                    extracted_curr_user_info = True
                    with open(self.output_file+"_posters_ff_data.json", 'a') as posters_file:
                        json.dump(data, posters_file, indent=4)
                        posters_file.write(',\n')
                except:
                    extracted_curr_user_info = False
                    print("API error, waiting for 2 mins before making next get friends and followers request")
                    time.sleep(120)
        print("Scraper thread finished scraping "+self.query['type'])


    def setKillFlag(self, flag):
        self.kill_flag = flag


    
    def run(self):
        if self.query['type']=='tweets':
            print("Scraper started scraping tweets . . .")
            self.extract_tweets()
        elif self.query['type'] == 'ff':
            print("Scraper started scraping firends and followers (ff) . . .")
            self.get_followers_following()


class TweetProcessor(threading.Thread):
    """
    Processes tweets and stores in desired format
    Also populates the posters queue
    """
    def __init__(self, tweet_queue, nodes_links, posters, posters_list, output_file) -> None:
        threading.Thread.__init__(self)
        self.tweet_queue = tweet_queue
        self.nodes_links = nodes_links
        self.posters = posters
        self.posters_list = posters_list
        self.kill_flag = False
        self.output_file = output_file

    def process_tweets(self):
        while True:
            if  self.kill_flag and self.tweet_queue.qsize()==0:
                break
            try:
                tweet = self.tweet_queue.get(block=False)
                data = {
                    "tweet": tweet.text,
                    "id": tweet.user.id,
                    "timestamp": int(datetime.datetime.timestamp(tweet.created_at)*1000),
                    "numLikes": tweet.favorite_count,
                    "numComments": tweet.retweet_count,
                    "numFollowers": tweet.user.followers_count,
                    "numFollowings": tweet.user.friends_count
                }
                self.nodes_links['nodes'].append(data)
                self.posters.put(tweet.user.id, block=False)
                self.posters_list.append(tweet.user.id)
                with open(self.output_file+"_tweets.json", 'a') as tweets_file:
                    json.dump(data, tweets_file, indent=4)
                    tweets_file.write(',\n')
                with open(self.output_file+"_posters.json", 'a') as posters_file:
                    json.dump({'serial': len(self.posters_list), 'id': tweet.user.id}, posters_file, indent=4)
                    posters_file.write(',\n')
            except:
                pass
        print("Tweet processor thread finished processing")

    def setKillFlag(self, flag):
        self.kill_flag = flag

    def run(self):
        print("Started processing raw tweets simultaneously . . .")
        self.process_tweets()

class LinkProcessor(threading.Thread):
    """
    Creates edges from the friends and followers
    """
    def __init__(self, friend_follower_queue, nodes_links, posters_list):
        threading.Thread.__init__(self)
        self.ff_queue = friend_follower_queue
        self.nodes_links = nodes_links
        self.kill_flag = False
        self.posters_list = posters_list

    def process_links(self):
        while True:
            if  self.kill_flag and self.ff_queue.qsize()==0:
                break
            try:
                id_ff = self.ff_queue.get(block=False)
                id = id_ff['id']
                followings = id_ff['followings']
                followers = id_ff['followers']
                for uid in self.posters_list:
                    if uid != id:
                        if uid in followings:
                            link = {
                                "source": id,
                                "target": uid
                            }
                            if link not in self.nodes_links['links']:
                                self.nodes_links['links'].append(link)
                        if uid in followers:
                            link = {
                                "source": uid,
                                "target": id
                            }
                            if link not in self.nodes_links['links']:
                                self.nodes_links['links'].append(link)
            except:
                pass
        print("Link processor finished processing")
    
    def setKillFlag(self, flag):
        self.kill_flag = flag

    def run(self):
        print("Started processing edges simultaneously . . .")
        self.process_links()



if(len(sys.argv)<4):
    print("Please pass hashtag or topic, from_data (ex: 202112010000 for Dec 1, 2021), and the name of the new output file(ex file.json)")
topic = sys.argv[1]
from_date = sys.argv[2]
output_file_name = sys.argv[3]

controller = Controller(topic, from_date, output_file_name)
controller.get_data()