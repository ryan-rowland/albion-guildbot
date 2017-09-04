const googleStorage = require('@google-cloud/storage');
const Jimp = require('jimp');

const credentials = require('../config').googleStorage;

const storage = googleStorage({
  projectId: credentials.project_id,
  credentials,
});

const bucket = storage.bucket('albion-images');

const FONT_SIZE = 32;
const ITEM_SIZE = 60;

const fontPromise = Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
const iconsPromise = Jimp.read('https://assets.albiononline.com/assets/images/killboard/fame-list__icons.png').then(image => {
  const fame = image.clone();
  fame.crop(0, 0, 100, 100);
  image.crop(110, 0, 100, 100);
  return {
    fame, swords: image
  };
});

function getItemUrl(item) {
  return item && [
    `https://gameinfo.albiononline.com/api/gameinfo/items/`,
    `${item.Type}.png`,
    `?count=${item.Count}`,
    `&quality=${item.Quality}`,
  ].join('');
}

function getItemImage(item, size) {
  const imgUrl = getItemUrl(item);
  return new Promise((resolve, reject) => {
    Jimp.read(imgUrl, (err, image) => {
      if (err) { return reject(err); }

      image.resize(size, size);
      resolve(image);
    })
  });
}

function fillRectangle(image, hex, x1, y1, x2, y2) {
  let x, y;
  for (x = x1; x < x2; x++) {
    for (y = y1; y < y2; y++) {
      image.setPixelColor(hex, x, y);
    }
  }
}

function createImage(target, event) {
  const equipment = [
    event[target].Equipment.MainHand,
    event[target].Equipment.OffHand,
    event[target].Equipment.Armor,
    event[target].Equipment.Shoes,
    event[target].Equipment.Head,
    event[target].Equipment.Mount,
  ];

  return Promise.all(equipment.map(item => item
    ? getItemImage(item, ITEM_SIZE)
    : Promise.resolve(new Jimp(ITEM_SIZE, ITEM_SIZE))
  )).then(images => {
    const output = new Jimp(ITEM_SIZE*6, ITEM_SIZE + FONT_SIZE)
    /*output.composite(images[0],           0, FONT_SIZE);
    output.composite(images[1],           0, FONT_SIZE + ITEM_SIZE);
    output.composite(images[2], ITEM_SIZE*1, FONT_SIZE);
    output.composite(images[3], ITEM_SIZE*1, FONT_SIZE + ITEM_SIZE);
    output.composite(images[4], ITEM_SIZE*2, FONT_SIZE);
    output.composite(images[5], ITEM_SIZE*2, FONT_SIZE + ITEM_SIZE);*/
    for(let i = 0; i < 6; i++) {
      output.composite(images[i], ITEM_SIZE*i, FONT_SIZE);
    }
    fillRectangle(output, Jimp.rgbaToInt(0, 0, 0, 255), 0, 4, ITEM_SIZE*6, FONT_SIZE-4);

    return fontPromise.then(font => {
      const itemPower = event.Victim.AverageItemPower;
      const gearScore = Math.round(itemPower).toLocaleString();
      const scoreDistance = itemPower > 999 ? 52
        : itemPower > 99 ? 35
        : itemPower > 9 ? 27
        : 19;
      output.print(font, ITEM_SIZE*6 - scoreDistance - FONT_SIZE, (FONT_SIZE-18)/2, gearScore);

      const killFame = event.TotalVictimKillFame.toLocaleString();
      output.print(font, FONT_SIZE+12, (FONT_SIZE-18)/2, killFame);

      if (event.TotalVictimKillFame < 25000) {
        output.crop(0, 0, ITEM_SIZE*6, FONT_SIZE);
      }

      output.quality(60);
      return iconsPromise;
    }).then(icons => {
      const fame = icons.fame.clone();
      fame.resize(32, 32);
      output.composite(fame, 5, 0);

      const swords = icons.swords.clone();
      swords.resize(32, 32);
      output.composite(swords, ITEM_SIZE*6 - FONT_SIZE - 5, 0);
      return new Promise((resolve, reject) => {
        output.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
          if (err) { return reject(err); }

          const fileUpload = bucket.file(`${event.EventId}.png`);
          const blobStream = fileUpload.createWriteStream({
            metadata: { contentType: Jimp.MIME_PNG }
          });

          blobStream.on('error', (error) => {
            console.error(error);
            reject(error);
          });

          blobStream.on('finish', () => {
            // The public URL can be used to directly access the file via HTTP.
            const url = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}?a=${Math.random().toString(36)}`;
            resolve(url);
          });

          blobStream.end(buffer);
        });
      });
    });
  });
}

module.exports = { createImage, getItemImage, getItemUrl };
