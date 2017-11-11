const _ = require('lodash')
const db = require('./lib/db')
const fs = require('fs')
const config = require('config')
const mkdirp = require('mkdirp')

const image_folder = config.get('runtime_data.base_dir')+config.get('runtime_data.scmpz.image_dir')
mkdirp.sync(image_folder)
db.query(`select * from images`).then((res)=>{
    _.each(res,(image)=>{
        fs.writeFileSync(`${image_folder}/${image.imageid}.png`, image.image);
    })
    process.exit()
})