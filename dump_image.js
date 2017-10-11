const _ = require('lodash')
const db = require('./lib/db')
const fs = require('fs')
const path = require('path')
let image_folder = path.resolve(__dirname,'public/images')
if (!fs.existsSync(image_folder))
    fs.mkdirSync(image_folder)
db.query(`select * from images`).then((res)=>{
    _.each(res,(image)=>{
        fs.writeFileSync(__dirname + `/public/images/${image.imageid}.png`, image.image);
    })
    process.exit()
})