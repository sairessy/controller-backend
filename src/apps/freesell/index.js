import freesellApp from "../../_setupServer.js"
import firebaseApp from "../../apis/firebase.js"
import Datastore from "nedb"


import {getStorage, ref, uploadString, getDownloadURL} from "firebase/storage"
const storage = getStorage()

const freesellDB = {
  users: new Datastore("./src/database/freesell/users.db"),
  products: new Datastore("./src/database/freesell/products.db")
}

freesellDB.users.loadDatabase()
freesellDB.products.loadDatabase()

// freesellDB.products.update({}, {$set: {removed: false, description: ""}}, {multi: true}, (err, nreplaced) => {
//   console.log(nreplaced)
// })

// freesellDB.users.update({}, {$set: {contact: "", companyName: "" }}, {multi: true}, (err, nreplaced) => {
//   console.log(nreplaced)
// })


freesellApp.post("/freesell/api/signup", (req, res) => {
  freesellDB.users.insert(req.body, (err, doc) => {
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
    freesellDB.products.find({removed: false}).limit(limit).exec( async (err, products) => {
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

      freesellDB.products.count({}, (err, num) => {
        res.json({
          products: ps,
          limitReached: limit >= num
        })
      }) 
    })
  } else {
    freesellDB.products.find({removed: false, category: category}).limit(limit).exec((err, products) => {
      freesellDB.products.count({removed: false, category: category}, async (err, num) => {
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
  const {email, companyName, contact, user} = req.body
  freesellDB.users.update({_id: user}, {$set: {email, companyName, contact}}, {multi: true}, (err, nreplaced) => {
    res.json({success: nreplaced > 0})
  })
})

freesellApp.post("/freesell/api/user", (req, res) => {
  freesellDB.users.findOne({_id: req.body.user}, (err, doc) => {
    res.json(doc)
  })
})

freesellApp.post("/freesell/api/productsuser", (req, res) => {
  freesellDB.products.find({user: req.body.user, removed: false}, async (err, products) => {
    const ps = products

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
    const ps = products

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