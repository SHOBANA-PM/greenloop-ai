// GreenLoop AI - data.js
// Seed tutorials (unique, no duplicates)

var SEED_TUTORIALS = [
  {
    id:1, emoji:'👜', title:'Jeans to Denim Tote Bag',
    creator:'EcoQueen_Arya', views:'4.2k', likes:231,
    wasteItem:'old denim jeans',
    kw:['jeans','denim','jean','denim jeans','trouser','pants','blue jeans'],
    steps:[
      'Cut both legs off your old jeans at the crotch seam cleanly',
      'Turn inside out and sew tightly across the bottom edge',
      'Turn right side out — this forms your bag body',
      'Cut two 60cm strips from the leg material for handles',
      'Sew handles firmly to the inside top edges of the bag',
      'Optionally add an inner pocket from leftover denim',
      'Decorate with fabric paint or patches and enjoy!'
    ],
    photoFile:null, videoFile:null,
    cat:'Bags', price:'Rs.350', priceNum:350, isMyUpload:false
  },
  {
    id:2, emoji:'✏️', title:'Pencil Stand from Ice Cream Sticks',
    creator:'Priya_Makes', views:'2.8k', likes:144,
    wasteItem:'ice cream sticks',
    kw:['ice cream','stick','popsicle','lolly','craft stick','wooden stick'],
    steps:[
      'Collect and wash 60 to 80 ice cream sticks thoroughly',
      'Glue 6 sticks flat side by side to form a solid base',
      'Stack sticks in a log-cabin square pattern using wood glue',
      'Apply glue between each layer and press firmly',
      'Let each layer dry 5 minutes before adding the next',
      'Build up 8 to 10 layers for the walls',
      'Sand rough edges and paint or varnish as desired'
    ],
    photoFile:null, videoFile:null,
    cat:'Home Decor', price:'Rs.90', priceNum:90, isMyUpload:false
  },
  {
    id:3, emoji:'🌿', title:'Hanging Bottle Planter',
    creator:'GreenThumb_Raj', views:'1.9k', likes:98,
    wasteItem:'plastic bottle',
    kw:['bottle','plastic','pet bottle','water bottle','cold drink','soda','2 litre','1 litre','mineral water'],
    steps:[
      'Take a clean 2L plastic bottle and remove all labels',
      'Cut the bottle in half horizontally with a sharp knife',
      'Poke 3 small drainage holes at the bottom using a hot nail',
      'Poke 3 evenly spaced holes near the top rim',
      'Thread strong twine through the top holes and knot securely',
      'Paint the outside with weather-resistant acrylic paint',
      'Fill with soil mix, plant a seedling, hang and water regularly'
    ],
    photoFile:null, videoFile:null,
    cat:'Planters', price:'Rs.120', priceNum:120, isMyUpload:false
  },
  {
    id:4, emoji:'📦', title:'Cardboard Desk Organiser',
    creator:'ReuseBox_Co', views:'1.2k', likes:67,
    wasteItem:'cardboard box',
    kw:['cardboard','box','carton','cereal box','corrugated','packaging','shoebox'],
    steps:[
      'Choose a sturdy cardboard box and decide the height you want',
      'Measure and mark your cut lines then cut cleanly with scissors',
      'Cut smaller boxes or card strips for internal dividers',
      'Glue dividers inside using hot glue or strong craft glue',
      'Let the glue dry completely for about 30 minutes',
      'Cover the outside with craft paper, washi tape or acrylic paint',
      'Label each compartment for pens, scissors, clips etc.'
    ],
    photoFile:null, videoFile:null,
    cat:'Home Decor', price:'Rs.75', priceNum:75, isMyUpload:false
  }
];

// User uploaded tutorials (added at runtime via Sell page)
var USER_TUTORIALS = [];

// Seed market products (unique, no duplicates)
var SEED_PRODUCTS = [
  {id:101, emoji:'👜', name:'Denim Tote Bag',       waste:'Old Jeans',        price:'Rs.350', priceNum:350, stars:'⭐⭐⭐⭐⭐', cat:'Bags',      photoFile:null, isMyUpload:false, sellerPhone:''},
  {id:102, emoji:'🌱', name:'Denim Pocket Planter', waste:'Old Jeans',        price:'Rs.185', priceNum:185, stars:'⭐⭐⭐⭐',  cat:'Planters',  photoFile:null, isMyUpload:false, sellerPhone:''},
  {id:103, emoji:'🌿', name:'Bottle Herb Planter',  waste:'Plastic Bottle',   price:'Rs.120', priceNum:120, stars:'⭐⭐⭐⭐⭐', cat:'Planters',  photoFile:null, isMyUpload:false, sellerPhone:''},
  {id:104, emoji:'👛', name:'Mini Denim Pouch',     waste:'Old Jeans',        price:'Rs.220', priceNum:220, stars:'⭐⭐⭐⭐',  cat:'Bags',      photoFile:null, isMyUpload:false, sellerPhone:''},
  {id:105, emoji:'✏️', name:'Stick Pencil Stand',   waste:'Ice Cream Sticks', price:'Rs.90',  priceNum:90,  stars:'⭐⭐⭐⭐⭐', cat:'Home Decor',photoFile:null, isMyUpload:false, sellerPhone:''},
  {id:106, emoji:'🖼️', name:'Stick Photo Frame',    waste:'Ice Cream Sticks', price:'Rs.110', priceNum:110, stars:'⭐⭐⭐⭐',  cat:'Art',       photoFile:null, isMyUpload:false, sellerPhone:''}
];

// User uploaded products (added at runtime)
var USER_PRODUCTS = [];

// Waste keyword dictionary for ML matching
var WASTE_DICT = {
  'plastic bottle': ['bottle','plastic','pet','water bottle','cold drink','soda','aerated','mineral water','2l','1l'],
  'old denim jeans': ['jeans','denim','jean','trouser','pants','denim jeans','shorts'],
  'cardboard box': ['cardboard','box','carton','packaging','cereal','corrugated','shoebox'],
  'ice cream sticks': ['ice cream','stick','popsicle','lolly','craft stick','wooden stick'],
  'glass jar': ['jar','glass','mason','container','pickle jar'],
  'tin can': ['tin','can','metal','aluminium','aluminum','food can'],
  'newspaper': ['newspaper','paper','newsprint','old paper','magazine'],
  'old clothes': ['clothes','shirt','cloth','fabric','textile','dress','clothing','kurta'],
  'cd dvd': ['cd','dvd','disc','disk','compact disc'],
  'rubber tyres': ['tyre','tire','rubber','wheel']
};
