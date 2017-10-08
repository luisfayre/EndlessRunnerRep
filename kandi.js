(function ($) {
// Variables
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var player, score, stop, ticker;
var ground = [], lava = [], enemies = [], environment = [];

// platform variables
var platformHeight, platformLength, gapLength;
var platformWidth = 32;
var platformBase = canvas.height - platformWidth;  // bottom row of the game
var platformSpacer = 64;

var canUseLocalStorage = 'localStorage' in window && window.localStorage !== null;
var playSound;

// set the sound preference
if (canUseLocalStorage) {
  playSound = (localStorage.getItem('kandi.playSound') === "true")

  if (playSound) {
    $('.sound').addClass('sound-on').removeClass('sound-off');
  }
  else {
    $('.sound').addClass('sound-off').removeClass('sound-on');
  }
}

/**
 * Get a random number between range
 * @param {integer}
 * @param {integer}
 */
function rand(low, high) {
  return Math.floor( Math.random() * (high - low + 1) + low );
}

/**
 * Bound a number between range
 * @param {integer} num - Number to bound
 * @param {integer}
 * @param {integer}
 */
function bound(num, low, high) {
  return Math.max( Math.min(num, high), low);
}

/**
 * Asset pre-loader object. Loads all images
 */
var assetLoader = (function() {
  // images dictionary
  this.imgs        = {
    'bg'            : 'imgs/bg1.png',
    'sky'           : 'imgs/sky3.png',
    'backdrop'      : 'imgs/backdrop23.png',
    'backdrop2'     : 'imgs/backdrop_ground2.png',
    'rock'         : 'imgs/rock.png',
    'avatar_normal' : 'imgs/normal_walk.png',
    'lava'         : 'imgs/lava.png',
    'grass1'        : 'imgs/grassMid1.png',
    'grass2'        : 'imgs/grassMid2.png',
    'bridge'        : 'imgs/bridge.png',
    'plant'         : 'imgs/plant.png',
    'bush1'         : 'imgs/bush1.png',
    'bush2'         : 'imgs/bush2.png',
    'cliff'         : 'imgs/grassCliffRight.png',
    'spikes'        : 'imgs/spikes.png',
    'box'           : 'imgs/boxCoin.png',
    'slime'         : 'imgs/slime.png'
  };

  //Sonidos
  this.sounds      = {
    'bg'            : 'sounds/bg.mp3',
    'jump'          : 'sounds/jump.mp3',
    'gameOver'      : 'sounds/gameOver.mp3'
  };

  var assetsLoaded = 0;                                //Assets img cargados
  var numImgs      = Object.keys(this.imgs).length;    //Assets img totales
  var numSounds    = Object.keys(this.sounds).length;  //Assets sonidos totales
  this.totalAssest = numImgs;                          //Assets totales

  /**
   * Ensure all assets are loaded before using them
   * @param {number} dic  - Dictionary name ('imgs', 'sounds', 'fonts')
   * @param {number} name - Asset name in the dictionary
   */
  function assetLoaded(dic,name) {
    if (this[dic][name].status !== 'loading') { //Los assets carganos no se cuentan
      return;
    }

    this[dic][name].status = 'loaded';
    assetsLoaded++;

    if (typeof this.progress === 'function') {//progress callback
      this.progress(assetsLoaded, this.totalAssest);
    }

    if (assetsLoaded === this.totalAssest && typeof this.finished === 'function') {//finished callback
      this.finished();
    }
  }

   // @param {object} sound - Name of the audio asset that was loaded.
   
  function _checkAudioState(sound) { //Verifica el estado del audio
    if (this.sounds[sound].status === 'loading' && this.sounds[sound].readyState === 4) {
      assetLoaded.call(this, 'sounds', sound);
    }
  }
  
  this.downloadAll =function() { //Crea los assets, llama callback , setea el asset
    var _this = this;
    var src;

    //Carga imagenes
    for (var img in this.imgs) {
      if (this.imgs.hasOwnProperty(img)) {
        src = this.imgs[img];
        //crea el cierre del vento
        (function(_this, img) {
          _this.imgs[img] = new Image();
          _this.imgs[img].status = 'loading';
          _this.imgs[img].name = img;
          _this.imgs[img].onload = function() { assetLoaded.call(_this, 'imgs', img) };
          _this.imgs[img].src = src;
        })(_this, img);
      }
    }
    //Carga sonidos
    for (var sound in this.sounds) {
      if (this.sounds.hasOwnProperty(sound)) {
        src = this.sounds[sound];
        //crea el cierre del vento
        (function(_this, sound) {
          _this.sounds[sound] = new Audio();
          _this.sounds[sound].status = 'loading';
          _this.sounds[sound].name = sound;
          _this.sounds[sound].addEventListener('canplay', function() {
            _checkAudioState.call(_this, sound);
          });
          _this.sounds[sound].src = src;
          _this.sounds[sound].preload = 'auto';
          _this.sounds[sound].load();
        })(_this, sound);
      }
    }
  }

  return {
    imgs: this.imgs,
    sounds: this.sounds,
    totalAssest: this.totalAssest,
    downloadAll: this.downloadAll
  };
})();


assetLoader.progress = function(progress, total) { //Muestra el progreso del asset
  var pBar = document.getElementById('progress-bar');
  pBar.value = progress / total;
  document.getElementById('p').innerHTML = Math.round(pBar.value * 100) + "%";
}


assetLoader.finished = function() { //Carga Menu
  mainMenu();
}


function SpriteSheet(path,frameWidth,frameHeight) { ///Hoja de sprites
  this.image = new Image();
  this.frameWidth = frameWidth;
  this.frameHeight = frameHeight;

  //Calcula el numero de frames en una fila despues de cargar las imagenes
  var self = this;
  this.image.onload =function() {
    self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
  };

  this.image.src = path;
}

/**
 * ANIMACION DE LA HOJA DE SPRITES
 * @param {SpriteSheet} //EL spritesheet se una para crear la animacion
 * @param {number}      //Numero de frames que espera para la animacion
 * @param {array}       //Rando de la secuencia de la anumacion
 * @param {boolean}     //Repetir la animacion
 */
function Animation(spritesheet, frameSpeed,startFrame, endFrame) { 

  var animationSequence = [];  //Array que almacena la secuencia de la animacion
  var currentFrame = 0;        //Frame actial
  var counter = 0;             //Radion del frame

  for (var frameNumber= startFrame; frameNumber <= endFrame; frameNumber++) //Rango de inicio y final del frame
    animationSequence.push(frameNumber);

  this.update = function() { //Act animacion

    
    if (counter ==  (frameSpeed -1)) //Sig frame
      currentFrame = (currentFrame +1) % animationSequence.length;

    
    counter = (counter + 1) % frameSpeed;//contador segun el frame
  };

 
   /** Frame acutal
   * @param {integer} x - X position to draw
   * @param {integer} y - Y position to draw*/
  this.draw = function(x, y) {
    var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
    var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

    ctx.drawImage(
      spritesheet.image,
      col * spritesheet.frameWidth, row * spritesheet.frameHeight,
      spritesheet.frameWidth, spritesheet.frameHeight,
      x, y,spritesheet.frameWidth, spritesheet.frameHeight);
  };
}

/*** Animacion parallax del fondo ***/
var background = (function() {
  var sky = {};
  var backdrop = {};
  var backdrop2 = {};

  
  this.draw = function() { //Dibuja los fondos a dif velociadades
    ctx.drawImage(assetLoader.imgs.bg, 0, 0);

    // Pan background
    sky.x -= sky.speed;
    backdrop.x -= backdrop.speed;
    backdrop2.x -= backdrop2.speed;

    //Dibuja las imagenes de lado a lado en un loop
    ctx.drawImage(assetLoader.imgs.sky, sky.x, sky.y);
    ctx.drawImage(assetLoader.imgs.sky, sky.x + canvas.width, sky.y);

    ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x, backdrop.y);
    ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x + canvas.width, backdrop.y);

    ctx.drawImage(assetLoader.imgs.backdrop2, backdrop2.x, backdrop2.y);
    ctx.drawImage(assetLoader.imgs.backdrop2, backdrop2.x + canvas.width, backdrop2.y);

   // If the image scrolled off the screen, reset
    if (sky.x + assetLoader.imgs.sky.width <= 0)
      sky.x = 0;
    if (backdrop.x + assetLoader.imgs.backdrop.width <= 0)
      backdrop.x = 0;
    if (backdrop2.x + assetLoader.imgs.backdrop2.width <= 0)
      backdrop2.x = 0;
  };

  this.reset = function()  {// Reset fondo a 0
    sky.x = 0;
    sky.y = 0;
    sky.speed = 0.2;

    backdrop.x = 0;
    backdrop.y = 0;
    backdrop.speed = 0.4;

    backdrop2.x = 0;
    backdrop2.y = 0;
    backdrop2.speed = 0.6;
  }

  return {
    draw: this.draw,
    reset: this.reset};
})();

/**
 * A vector 2d
 * @param {integer} x - Center x coordinate.
 * @param {integer} y - Center y coordinate.
 * @param {integer} dx - Change in x.
 * @param {integer} dy - Change in y.
 */
function Vector(x, y, dx, dy) {
  // position
  this.x = x || 0;
  this.y = y || 0;
  // direction
  this.dx = dx || 0;
  this.dy = dy || 0;
}


Vector.prototype.advance = function() { // cambien la posiscion del vector by dx,dy
  this.x += this.dx;
  this.y += this.dy;
};

Vector.prototype.minDist = function(vec) { //Obtener la distacni minima de los vectores entre si
  var minDist = Infinity;
  var max = Math.max( Math.abs(this.dx), Math.abs(this.dy),
                          Math.abs(vec.dx ), Math.abs(vec.dy ) );
  var slice   = 1 / max;

  var x, y, distSquared;

  //Obtener la media de los 2 vectores
  var vec1 = {}, vec2 = {};
  vec1.x = this.x + this.width/2;
  vec1.y = this.y + this.height/2;
  vec2.x = vec.x + vec.width/2;
  vec2.y = vec.y + vec.height/2;
  for (var percent = 0; percent < 1; percent += slice) {
    x = (vec1.x + this.dx * percent) - (vec2.x + vec.dx * percent);
    y = (vec1.y + this.dy * percent) - (vec2.y + vec.dy * percent);
    distSquared = x * x + y * y;

    minDist = Math.min(minDist, distSquared);
  }

  return Math.sqrt(minDist);
};

var player = (function(player) { //Objeto del jugador
  //Propiedadees
  player.width = 60;
  player.height = 96;
  player.speed = 6;

  //Salto
  player.gravity= 1;
  player.dy = 0;
  player.jumpDy = -10;
  player.isFalling = false;
  player.isJumping = false;

  //Spritesheets
  player.sheet = new SpriteSheet('imgs/normal_walk.png', player.width, player.height);
  player.walkAnim = new Animation(player.sheet, 4, 0, 15);
  player.jumpAnim = new Animation(player.sheet, 4, 15, 15);
  player.fallAnim = new Animation(player.sheet, 4, 11, 11);
  player.anim = player.walkAnim;

  Vector.call(player, 0, 0, 0, player.dy);

  var jumpCounter = 0;  // Tiempo en el que el salta cuando presionana el boton

  player.update = function() { //Act la pocioon y animacion del jugadore
    //Verificacion de si el jugador esta saltando
    if (KEY_STATUS.space && player.dy === 0 && !player.isJumping) {
      player.isJumping = true;
      player.dy = player.jumpDy;
      jumpCounter = 12;
      assetLoader.sounds.jump.play();
    }

    //Salto alto cuando la barra ser preciona mas
    if (KEY_STATUS.space && jumpCounter) {
      player.dy = player.jumpDy;
    }

    jumpCounter = Math.max(jumpCounter-1,0);

    this.advance();

    //Gravedad al caer
    if (player.isFalling || player.isJumping) {
      player.dy += player.gravity;
    }

    //Cambio de animaciomn
    if (player.dy >0) {
      player.anim = player.fallAnim;
    }
    //Cambio de animaciomn saltando
    else if (player.dy < 0) {
      player.anim = player.jumpAnim;
    }
    else {
      player.anim = player.walkAnim;
    }

    player.anim.update();
  };

  /**
   * Draw the player at it's current position
   */
  player.draw = function() {
    player.anim.draw(player.x, player.y);
  };

  player.reset = function() { //Reset posision del jugador
    player.x =64;
    player.y = 250;
  };
  return player;

})(Object.create(Vector.prototype));


function Sprite(x, y, type) { //Dibujo de sprites
  this.x      = x;
  this.y      = y;
  this.width  = platformWidth;
  this.height = platformWidth;
  this.type   = type;
  Vector.call(this, x, y, 0, 0);

  this.update = function() { //Velocdad del el sprite del player
    this.dx = -player.speed;
    this.advance();
  };

  this.draw = function() { //Posicion actual del sprite
    ctx.save();
    ctx.translate(0.5 ,0.5);
    ctx.drawImage(assetLoader.imgs[this.type], this.x, this.y);
    ctx.restore();
  };
}
Sprite.prototype = Object.create(Vector.prototype);

//Tipo de platadorma 
function getType() { 
  var type;
  switch (platformHeight) {
    case 0:
    case 1:
      type = Math.random() > 0.5 ? 'grass1' : 'grass2';
      break;
    case 2:
      type = 'rock';
      break;
    case 3:
      type = 'bridge';
      break;
    case 4:
      type = 'box';
      break;
  }
  if (platformLength ===1 && platformHeight < 3 && rand(0, 3) === 0) {
    type = 'cliff';
  }

  return type;
}


function updateGround() { //Posicion del piso y coliciones con el jugadore
  player.isFalling = true;
  for (var i = 0; i < ground.length; i++) {
    ground[i].update();
    ground[i].draw();

    var angle;
    if (player.minDist(ground[i]) <=player.height/2 + platformWidth/2 &&
        (angle = Math.atan2(player.y - ground[i].y, player.x - ground[i].x) * 180/Math.PI) > -130 &&
        angle <-50) {
      player.isJumping = false; 
      player.isFalling = false;
      player.y = ground[i].y - player.height + 5;
      player.dy = 0;
    }
  }

  if (ground[0] && ground[0].x < -platformWidth) {
    ground.splice(0,1);
  }
}

function updateLava() {
  //Animacion de la lava
  for (var i = 0; i < lava.length; i++) {
    lava[i].update();
    lava[i].draw();
  }
  if (lava[0] && lava[0].x < -platformWidth) {
    var w = lava.splice(0, 1)[0];
    w.x = lava[lava.length-1].x + platformWidth;
    lava.push(w);
  }
}

function updateEnvironment() { //Elementos animacion
  for (var i = 0; i < environment.length; i++) {
    environment[i].update();
    environment[i].draw();
  }
  //Remover elementos cuando los  pasan del vorede de la pantalla
  if (environment[0] && environment[0].x < -platformWidth) {
    environment.splice(0,1);
  }
}

function updateEnemies() {//Act de los enemigos
  //Animacion de los enemigos
  for (var i = 0; i < enemies.length; i++) {
    enemies[i].update();
    enemies[i].draw();

    //Si el player toca a un enemigo el juego acaba
    if (player.minDist(enemies[i]) <= player.width - platformWidth/2) {
       gameOver();
    }
  }

  //Remover cuando los enemigos pasan del vorede de la pantalla
  if (enemies[0] && enemies[0].x< -platformWidth) {
    enemies.splice(0,1);
  }
}

function updatePlayer() { //Personaje update
  player.update();
  player.draw();

  if (player.y + player.height >= canvas.height) { //Gme over cuando el jugador pasa del canvas
    gameOver();
  }
}

function spawnSprites() { //Spawn de sprites condorme a mas score
  score++;

  if (gapLength > 0) {
    gapLength--;
  }

  else if (platformLength >0) { //Creacion del suele despes del gap
    var type = getType();
    ground.push(new Sprite(
      canvas.width + platformWidth % player.speed,
      platformBase - platformHeight * platformSpacer,type
    ));
    platformLength--;

    spawnEnvironmentSprites();//Random 
    spawnEnemySprites();//Random 
  }
  else {
    gapLength = rand(player.speed - 2, player.speed); //Incrementa el gap dependiendo la velociadad
    platformHeight = bound(rand(0, platformHeight + rand(0, 2)), 0, 4);
    platformLength = rand(Math.floor(player.speed/2), player.speed * 4);
  }
}

function spawnEnvironmentSprites() { //Spawn nuevos elementos cuando salen de la pantalla
  if (score> 40 && rand(0, 20) === 0 && platformHeight < 3) {
    if (Math.random() >0.5) {
      environment.push(new Sprite(
        canvas.width + platformWidth % player.speed,
        platformBase - platformHeight * platformSpacer- platformWidth,
        'plant'
      ));
    }
    else if(platformLength > 2) {
      environment.push(new Sprite(
        canvas.width + platformWidth % player.speed,
        platformBase - platformHeight * platformSpacer- platformWidth,
        'bush1'
      ));
      environment.push(new Sprite(
        canvas.width + platformWidth % player.speed + platformWidth,
        platformBase - platformHeight * platformSpacer- platformWidth,
        'bush2'
      ));
    }
  }
}

function spawnEnemySprites() {//Spawn nuevos enemigos cuando salen de la pantalla
  if (score > 100 && Math.random() > 0.96 && enemies.length < 3 && platformLength > 5 &&
      (enemies.length ? canvas.width - enemies[enemies.length-1].x >= platformWidth * 3 ||
       canvas.width - enemies[enemies.length-1].x <platformWidth : true)) {
    enemies.push(new Sprite(
      canvas.width + platformWidth % player.speed,
      platformBase - platformHeight * platformSpacer- platformWidth,
      Math.random() > 0.5 ? 'spikes' : 'slime'
    ));
  }
}

function animate() { //Loop del juego
  if (!stop) {
    requestAnimFrame( animate );
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    background.draw();

    //Entidades animacion
    updateLava();
    updateEnvironment();
    updatePlayer();
    updateGround();
    updateEnemies();

    //Score
    ctx.fillText('Puntuación: ' + score + ' m', canvas.width - 140, 30);
    ctx.fillStyle = 'white';

    //Spawn nuevo Sprite
    if (ticker % Math.floor(platformWidth / player.speed)=== 0) {
      spawnSprites();
    }

    //Incrementa la vel del jugador solo cuando salta
    if (ticker >(Math.floor(platformWidth / player.speed) * player.speed *20) && player.dy !== 0) {
      player.speed = bound(++player.speed, 0,15);
      player.walkAnim.frameSpeed = Math.floor(platformWidth / player.speed) - 1;
      
      ticker = 0;//reset ticker 0

      if (gapLength === 0) {
        var type = getType();
        ground.push(new Sprite(
          canvas.width + platformWidth % player.speed,
          platformBase - platformHeight *platformSpacer,
          type
        ));
        platformLength--;
      }
    }
    ticker++; //aumento de tricker
  }
}

var KEY_CODES = { //Eventos del teclado
  32: 'space'
};
var KEY_STATUS = {};
for (var code in KEY_CODES) {
  if (KEY_CODES.hasOwnProperty(code)) {
     KEY_STATUS[KEY_CODES[code]] = false;
  }
}
document.onkeydown = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[keyCode]] = true;
  }
};
document.onkeyup = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[keyCode]] = false;
  }
};

/**Animacion Polyfill del fondo**/
var requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function(callback, element){
            window.setTimeout(callback, 1000 / 60);};
})();

function mainMenu() { //Menu principal
  for (var sound in assetLoader.sounds) {
    if (assetLoader.sounds.hasOwnProperty(sound)) {
      assetLoader.sounds[sound].muted = !playSound;
    }
  }

  $('#progress').hide();
  $('#main').show();
  $('#menu').addClass('main');
  $('.sound').show();
}

function startGame() { //Inicio del juego resetenado todos los elementos del juego
  document.getElementById('game-over').style.display = 'none';
  ground = [];
  lava = [];
  environment = [];
  enemies = [];
  player.reset();
  ticker = 0;
  stop = false;
  score = 0;
  platformHeight = 2;
  platformLength = 15;
  gapLength = 0;

  ctx.font = '16px arial, sans-serif';

  for (var i = 0; i < 30; i++) {
    ground.push(new Sprite(i * (platformWidth - 3), platformBase - platformHeight * platformSpacer, 'rock'));
  }

  for (i = 0; i < canvas.width / 32 + 2; i++) {
    lava.push(new Sprite(i * platformWidth, platformBase, 'lava'));
  }

  background.reset(); //reset de fondo

  animate(); //anumacion
  //sonidos
  assetLoader.sounds.gameOver.pause();
  assetLoader.sounds.bg.currentTime = 0;
  assetLoader.sounds.bg.loop = true;
  assetLoader.sounds.bg.play();
}

function gameOver() { //Fin del juego
  stop = true;
  $('#score').html(score);
  $('#game-over').show();
  assetLoader.sounds.bg.pause();
  assetLoader.sounds.gameOver.currentTime = 0;
  assetLoader.sounds.gameOver.play();
}

//handlers para los menus
$('.credits').click(function() {
  $('#main').hide();
  $('#credits').show();
  $('#menu').addClass('credits');
});
$('.back').click(function() {
  $('#credits').hide();
  $('#main').show();
  $('#menu').removeClass('credits');
});
$('.sound').click(function() {
  var $this = $(this);
  //sound off
  if ($this.hasClass('sound-on')) {
    $this.removeClass('sound-on').addClass('sound-off');
    playSound = false;
  }
  //sound on
  else {
    $this.removeClass('sound-off').addClass('sound-on');
    playSound = true;
  }

  if (canUseLocalStorage) {
    localStorage.setItem('kandi.playSound', playSound);
  }

  //mute
  for (var sound in assetLoader.sounds) {
    if (assetLoader.sounds.hasOwnProperty(sound)) {
      assetLoader.sounds[sound].muted = !playSound;
    }
  }
});
$('.play').click(function() {
  $('#menu').hide();
  startGame();
});
$('.restart').click(function() {
  $('#game-over').hide();
  startGame();
});

assetLoader.downloadAll(); //Cargar los assets del jQuerry
})(jQuery);