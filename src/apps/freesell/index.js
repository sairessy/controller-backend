import config from "../../config.js"
import Datastore from "nedb"
import transporter from "../../apis/nodemailer.js"
import freesellApp from "../../_setupServer.js"
import firebaseApp from "../../apis/firebase.js"
import {getStorage, ref, uploadString, getDownloadURL} from "firebase/storage"


const storage = getStorage()

const freesellDB = {
  users: new Datastore("./src/database/freesell/users.db"),
  products: new Datastore("./src/database/freesell/products.db"),
  feedbacks: new Datastore("./src/database/freesell/feedbacks.db")
}

freesellDB.users.loadDatabase()
freesellDB.products.loadDatabase()
freesellDB.feedbacks.loadDatabase()

// freesellDB.products.update({}, {$set: {removed: false, description: ""}}, {multi: true}, (err, nreplaced) => {
//   console.log(nreplaced)
// })

// freesellDB.users.update({}, {$set: {location: ""}}, {multi: true}, (err, nreplaced) => {
//   console.log(nreplaced)
// })

freesellApp.post("/freesell/api/signup", (req, res) => {
  const data = req.body

  freesellDB.users.findOne({email: data.email, location: "1", companyName: "", companyType: "0"}, (err, user) => {
    if(user != null) {
      res.json({err: "O email já foi usado!"})
    } else {
      freesellDB.users.insert({...data, 
        recoveryCode:  Math.random().toString().substr(2, 5)}, (err, doc) => {
        res.json(doc)
      })
    }  
  })
})

freesellApp.post("/freesell/api/feedback", (req, res) => {
  freesellDB.feedbacks.insert({
    feedback: req.body.feedback,
    email: req.body.email,
    date: Date.now().toString()
  }, (err, doc) => {
    res.json(doc)
  })
})

freesellApp.post("/freesell/api/login", (req, res) => {
  const {email, pass} = req.body
  freesellDB.users.findOne({email, pass}, (err, doc) => {
    const success = doc != null

    res.json(doc)
  })
})

freesellApp.get("/freesell/api/checkauth", (req, res) => {
  res.json({success: req.cookies.user != undefined})
})

freesellApp.post("/freesell/api/sendrecoverycode", (req, res) => {
  const email = req.body.email
  
  freesellDB.users.findOne({email: email}, async (err, user) => {
    if(user !== null) {
      const link = config.server + `/recoverypassword.html?u=${user._id}&c=${user.recoveryCode}`
      
      try {
        let info = await transporter.sendMail({
          from: '"Freesell 👻"', // sender address
          to: email, // list of receivers
          subject: "Link de recuperação da conta no free$sell!", // Subject line
          text: "Link: " + link, // plain text body
          // html: "<b>Hello world?</b>", // html body
        });
        console.log("Message sent: %s", info.messageId);
      } catch (error) {
        console.error(error)
      }
    
      res.json({y: ""})
    } else {
      res.json({err: ""})
    }
  })

})

freesellApp.post("/freesell/api/changepassword", (req, res) => {
  const {user, code, pass} = req.body

  freesellDB.users.update({_id: user, recoveryCode: code}, {$set: {
    pass: pass, recoveryCode: Math.random().toString().substr(2, 5)
  }}, {multi: true}, (err, nreplaced) => {
    res.json({success: nreplaced > 0})
  })
})

freesellApp.post("/freesell/api/addproduct", (req, res) => {
  const {title, price, category, location, user, image} = req.body
  
  const date = Date.now().toString()
  if(image != null) {
    const storageRef = ref(storage, `/images/${date}.${image.ext}`)
    uploadString(storageRef, image.data, "data_url").then(snapshot => {
      getDownloadURL(snapshot.ref).then( url => {
        const product = {
          title, price, category, location, removed: false, date: date, user: user, image: {data: url, ext: image.ext}
        }

        freesellDB.products.insert(product, (err, doc) => {
          res.json(doc)
        })
      });
    })
  } else {
    const product = {
      title, price, category, location, removed: false, date: Date.now().toString(), user: user, image: null
    }

    freesellDB.products.insert(product, (err, doc) => {
      res.json(doc)
    })
  }
})

freesellApp.get("/freesell/api/products", (req, res) => {
  freesellDB.products.find({}, (err, data) => {
    res.json(data)
  })
})

freesellApp.post("/freesell/api/products", (req, res) => {
  const {limit, category} = req.body

  if(category == "") {
    freesellDB.products.find({removed: false}).limit(limit).sort({date: -1}).exec( async (err, products) => {
      const ps = products
      // .sort((a, b) => {
      //   return parseInt(b.date - a.date)
      // })
      
      for (let i = 0; i < ps.length; i++) {
        
        const userInfo = await new Promise((resolve, reject) => {
          freesellDB.users.findOne({_id: ps[i].user}, (err, docx) => {
            resolve(docx)
          })
        })

        ps[i].contact = userInfo.contact
        ps[i].companyName = userInfo.companyName
      }

      freesellDB.products.count({}, (err, num) => {
        res.json({
          products: ps,
          limitReached: limit >= num
        })
      }) 
    })
  } else {
    freesellDB.products.find({removed: false, category: category}).limit(limit).sort({date: -1}).exec((err, products) => {
      freesellDB.products.count({removed: false, category: category}, async (err, num) => {
        const ps = products
        // .sort((a, b) => {
        //   return parseInt(b.date - a.date)
        // })
        
        for (let i = 0; i < ps.length; i++) {
          const userInfo = await new Promise((resolve, reject) => {
            freesellDB.users.findOne({_id: ps[i].user}, (err, docx) => {
              resolve(docx)
            })
          })

          ps[i].contact = userInfo.contact
          ps[i].companyName = userInfo.companyName
        }

        res.json({
          products: ps,
          limitReached: limit >= num
        })
      }) 
    })
  }
})

freesellApp.get("/freesell/api/removeproduct/:id", (req, res) => {
  const id = req.params.id
  freesellDB.products.update({_id: id}, {$set: {removed: true}}, {multi: true}, (err, nreplaced) => {
    res.json({success: nreplaced > 0})
  })
})

freesellApp.post("/freesell/api/updateuserprofile", (req, res) => {
  const {email, companyName, contact, user, companyType, location} = req.body

  freesellDB.users.update({_id: user}, {$set: {email, companyName, contact, companyType, location}}, {multi: true}, (err, nreplaced) => {
    res.json({success: nreplaced > 0})
  })
  
})

freesellApp.get("/freesell/api/users", (req, res) => {
  freesellDB.users.find({}, (err, docs) => {
    const users = []

    for (let i = 0; i < docs.length; i++) {
      const user = docs[i]
      if(user.companyName != undefined) {
        const {_id, companyName, companyType, location} = user
        users.push({_id, companyName, companyType, location})
      }
    }

    res.json(users)
  })
})

freesellApp.post("/freesell/api/user", (req, res) => {
  freesellDB.users.findOne({_id: req.body.user}, (err, doc) => {
    res.json(doc)
  })
})

freesellApp.post("/freesell/api/productsuser", (req, res) => {
  freesellDB.products.find({user: req.body.user, removed: false}).sort({date: -1}).exec(async (err, products) => {
    const ps = products
    // .sort((a, b) => {
    //   return parseInt(b.date - a.date)
    // })

    for (let i = 0; i < ps.length; i++) {
        
      const userInfo = await new Promise((resolve, reject) => {
        freesellDB.users.findOne({_id: ps[i].user}, (err, docx) => {
          resolve(docx)
        })
      })

      ps[i].contact = userInfo.contact
      ps[i].companyName = userInfo.companyName
    }
    
    res.json(ps)
  })
})

freesellApp.post("/freesell/api/products/seller", (req, res) => {
  freesellDB.products.find({user: req.body.seller, removed: false}, async (err, products) => {
    const ps = products.sort((a, b) => {
      return parseInt(b.date - a.date)
    })

    for (let i = 0; i < ps.length; i++) {
        
      const userInfo = await new Promise((resolve, reject) => {
        freesellDB.users.findOne({_id: ps[i].user}, (err, docx) => {
          resolve(docx)
        })
      })

      ps[i].contact = userInfo.contact
      ps[i].companyName = userInfo.companyName
    }
    
    res.json(ps)
  })
})

freesellApp.get("/freesell/api/user/:text", (req, res) => {
  freesellDB.users.findOne({companyName: req.params.text}, (err, doc) => {
    if(doc != null) {
      const {_id, companyName} = doc
      res.json({_id, companyName})
    } else {
      res.json({})
    }
  })
})

freesellApp.get("/freesell/api/logout", (req, res) => {
  res.clearCookie("user")
  res.json({success: true})
})

freesellApp.post("/freesell/api/search", (req, res) => {
  const text = req.body.text
  freesellDB.products.find({}, async (err, products) => {
    const ps = products.filter(m => m.title.toLowerCase().includes(text.toLowerCase()))
    
    for (let i = 0; i < ps.length; i++) {
      const userInfo = await new Promise((resolve, reject) => {
        freesellDB.users.findOne({_id: ps[i].user}, (err, docx) => {
          resolve(docx)
        })
      })

      ps[i].contact = userInfo.contact
      ps[i].companyName = userInfo.companyName
    }

    res.json({products: ps})
  })
})

export default freesellApp