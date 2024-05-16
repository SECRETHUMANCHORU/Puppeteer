const express = require('express');
const app = express();
const openaiChatRouter = require('./src/openai/chat');
const aipi = require('./src/openai/pi');
const aternosServerRouter = require('./src/aternos/server');
const aternosPlayerRouter = require('./src/aternos/players');
const aternosSayRouter = require('./src/aternos/say');
const youtubeMp3Router = require('./src/youtube/mp3');
const youtubeMp4Router = require('./src/youtube/mp4');
const TikTokdown = require('./src/tiktok');
const fbsign = require('./src/facebook/token');
/*const fbstalk = require('./src/facebook/stalk');
*/
const aiDemo = require('./src/openai/demo-chat');
app.set('json spaces', 4);

app.use(express.static('public')); // Serve static files from the 'public' directory

// Define routes

app.use('/openai/chat', openaiChatRouter);
app.use('/pi', aipi);
/*app.use('/aternos/server', aternosServerRouter);
app.use('/aternos/players', aternosPlayerRouter);
app.use('/aternos/say', aternosSayRouter)*/

app.use('/youtube/mp3', youtubeMp3Router);
app.use('/youtube/mp4', youtubeMp4Router);
app.use('/tiktok', TikTokdown);
app.use('/facebook/sign', fbsign)
//app.use('/facebook/stalk', fbstalk)
// Route to serve index.html for the root URL
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

console.log("routes installing")
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
