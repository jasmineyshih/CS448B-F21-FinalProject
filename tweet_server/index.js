var Twit = require('twit')
 
var T = new Twit({
//   consumer_key: "yt6ZBzuavluQsJ71N45e9EYSx",
//   consumer_secret: "BCty3iMFqV1DBC5WWLm7BcbNYWZG7nbQ3Gmonrqh54gSXYn6pu",
    consumer_key: "dzqSMgV9xZiJUlUzoo4zhwdee",
    consumer_secret: "qX3oxjk6B2zmEyQiE79D4woSIKMlcIRqxzcy71ZWzke7LO82ZY",
  access_token: "2328202038-Ecp9f5HkQ12HXgD2nE0rvIg4x0FXGFW8zZTGsrX",
  access_token_secret: "vh8S3pKSNjKnnk2BOAoRWUSXkMgRvU49Y5w7QYB2dmlOK"
})
 

T.get('followers/ids', { user_id: '1365408030121197572' },  function (err, data, response) {
    console.log(data)
})
  

// T.get('search/tweets', { q: '#urbandictionary since:2021-12-01', count: 15, max_id: null }, function(err, data, response) {
//   console.log(data)
// })

// async function getAllTweets(tag, from){
//     let list_tweets = []
//     let max_id = null
//     let count_iter = 0
//     while(max_id !== null || count_iter === 0){
//         let data = await (await T.get('followers/ids', { user_id: '1145708836633710592', count: 1})).data
//             console.log(data)
//             // data.statuses.forEach(status => {
//             //     list_tweets.push(status)
//             // });
//             // let next_results = data.search_metadata.next_results
//             // max_id = getMaxIdFromNextString(next_results)
//         count_iter++
//         if(count_iter === 1){
//             break
//         }
//     }
//     // console.log(list_tweets)
//     console.log(list_tweets.length)
// }


function getMaxIdFromNextString(next_string){
    let max_id = ''
    // let found_first_digit = false
    for(let i = 8; i<next_string.length; i++){
        c = next_string.charAt(i)
        if(c === '&'){
            break
        }
        max_id += c
    }
    return +max_id
}

// console.log(getMaxIdFromNextString('?max_id=1466706347529932801&q=%23urbandictionary%20since%3A2021-12-01&include_entities=1'))

// getAllTweets('#Stanford', '2021-12-03')