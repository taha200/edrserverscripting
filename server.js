var express = require('express');
var http = require('http');

const app = express()
var server = http.createServer(app);
var Mongoose = require('mongoose')
var cors = require('cors')
var bodyParser=require('body-parser')
var Patient= require('./models/Patient')
var Doc= require('./models/Doctor')
var Activity = require ('./models/Activity')
var Chats = require ('./models/Chat')
var mongoose = require('mongoose')
const client = require('socket.io').listen(server).sockets;


Mongoose.connect('mongodb://taha:taha123@ds363098.mlab.com:63098/edrcare',{ useNewUrlParser: true })

var db = Mongoose.connection //Mongo Connection Instance
db.on('open', () => console.log('database connected'))
app.use(cors())
app.use(bodyParser.json())  //Body Parser MiddleWare
app.use(express.json())


// User Module
client.on("connection",(socket)=>{
    socket.on('input', (response) => {

        let data = JSON.parse(response)
        let { chatId } = data
        let message = {}
            message = {
                text:data.text,
                image:data.image,
                join:data.join,
                senderID:data.senderID,
                audio:data.audio,
          
            }
           
        let firebaseUID = data.senderID
        // Check for name and message
        if (firebaseUID == '' || message == undefined) {
            // Send error status
            return
        } else {
            // Insert message
            Chats.findByIdAndUpdate(chatId, { $push: { messages: message } }, { new: true }, (err, docs) => {
                if (err) console.log('Error: ' + err)
                let newmsg = docs.messages[docs.messages.length - 1]
                // newmsg.fName = docs.fName
                let emitter = socket.broadcast
                emitter.emit('Sent', JSON.stringify(newmsg))
            })
            // Chats.insert({firebaseUID: firebaseUID, message: message}, function(){
            //     client.emit('output', [data]);

            //     // Send status object
            //     sendStatus({
            //         message: 'Message sent',
            //         clear: true
            //     });
            // });
        }
    });

})
function handleSuccess(data){
    return {
        message:"Success",
        doc:data
    }
}
function handleError(err){
    return {
        message:"Failed",
        err
    }
}
app.post('/api/patientSignUp',(req,res)=>{
    Patient.create(req.body,(err,doc)=>{
       if(err){
           return res.json(handleError(err))
       }
       else{
        Activity.create({ firebaseUID: doc.firebaseUID })

           return res.json(handleSuccess(doc))
       }
    })
})
app.post('/api/doctorSignUp',(req,res)=>{
    Doc.create(req.body,(err,doc)=>{
       if(err){
           return res.json(handleError(err))
       }
       else{
        Activity.create({ firebaseUID: doc.firebaseUID })

           return res.json(handleSuccess(doc))
       }
    })
})
app.get('/api/getDoctorslist',(req,res)=>{
    Doc.find((err,docs)=>{
        if(err){
            return res.json(handleError(err))
        }
        else{
            return res.json(handleSuccess(docs))
        }
     })
})

app.post('/api/getSinglePatient',(req,res)=>{
    Patient.findOne({firebaseUID:req.body.firebaseUID},(err,doc)=>{
        if(err){
            return res.json(handleError(err))
        }
        else{
            return res.json(handleSuccess(doc))
        }
    })
})
app.put('/api/getMessages', (req, res) => {         //get messages of a chat from listing
    Chats.findOne({ DocID: req.body.DocID, firebaseUID: req.body.firebaseUID }, (err, docs) => {
        if (err) res.json(err)
        console.log(docs)
        if (docs !== null) {
            res.json({
                message: "Success",
                data: docs
            })
        }
        else {
            let data = req.body
            Chats.create(data, (err, doc) => {
                if (err) res.json(err)
                if (doc !== null) {
                    Activity.findOneAndUpdate({ firebaseUID: req.body.firebaseUID }, { $push: { Conversations: doc._id } }, { new: true }, (err, res) => console.log('Patient', res))
                    Activity.findOneAndUpdate({ firebaseUID: req.body.DocID }, { $push: { Conversations: doc._id } }, { new: true }, (err, res) => console.log('Doc', res))
                    res.json({
                        message: "Chat created",
                        data: doc
                    })

                }

            })
        }
    })
})
app.put('/api/getChats', (req, res) => { //get messages of a chat from conversations
    if (req.body.firebaseUID) {
        Activity.findOne({ firebaseUID: req.body.firebaseUID }, 'Conversations', (err, doc) => {
            if (err) return res.json({ err })

            if (doc.Conversations) {
                let conversations = doc.Conversations
                let objecIDs = conversations.map(conversation => mongoose.Types.ObjectId(conversation))
                if (conversations.length > 0) {
                    Chats.find({ _id: { $in: objecIDs } }, (err, docs) => {
                        if (err) {
                            return res.json({ err })
                        }
                        if (docs.length > 0) {
                            return res.json({
                                message: "Success",
                                data: docs
                            })
                        }
                    })
                }
            }
        })
    } else {
        return res.json({ err: "Valid UID is required" })
    }
})

server.listen(8000);
// send a message
console.log('Server has started!');