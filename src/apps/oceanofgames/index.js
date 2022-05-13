import Datastore from "nedb"
import oceanofmoviesApp from "./../../_setupServer.js"

const oceanofmoviesDB = {
  movies: new Datastore("./src/database/oceanofmovies/movies.db")
}

oceanofmoviesDB.movies.loadDatabase()

oceanofmoviesApp.post("/oceanofmovies/api/movies", (req, res) => {
  const {limit, category} = req.body
  if(category == "") {
    oceanofmoviesDB.movies.find({}).limit(limit).exec((err, movies) => {
      oceanofmoviesDB.movies.count({}, (err, num) => {
        res.json({data: {
          movies,
          limitReached: limit >= num
        }})
      }) 
    })
  } else {
    oceanofmoviesDB.movies.find({}, (err, movies) => {
      const mvs = movies.filter(m => m.categories.includes(parseInt(category)))

      const finalData = []
      const lim = limit <= mvs.length ? limit : mvs.length
      
      for (let i = 0; i < lim; i++) {
        finalData.push(mvs[i])
      }

      res.json({data: {
        movies: finalData,
        limitReached: limit >= mvs.length
      }})
    })
  }
})

oceanofmoviesApp.get("/oceanofmovies/api/movie/:id", (req, res) => {
  const id = req.params.id
  oceanofmoviesDB.movies.findOne({_id: id}, (err, movie) => {
    res.json(movie)
  })
})

oceanofmoviesApp.post("/oceanofmovies/api/search", (req, res) => {
  const text = req.body.text
  oceanofmoviesDB.movies.find({}, (err, movies) => {
    res.json({data: {movies: movies.filter(m => m.title.toLowerCase().includes(text.toLowerCase()))}})
  })
})

oceanofmoviesApp.post("/oceanofmovies/api/addmovie", (req, res) => {
  const movie = req.body
  oceanofmoviesDB.movies.insert(movie, (err, doc) => {
    res.json(doc)
  })
})

export default oceanofmoviesApp