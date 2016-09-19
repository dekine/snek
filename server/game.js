var uuid = require('./uuid');
var Snake = require('./snake');
var collider = require('./collider');
var getRandom = require('./getrandom');

var Game = function(io,players) {
  this.io = io;
  this.players = players;
};

Game.prototype = {
  size : 5,    // starting snake size
  winLength : 15,
  width : 42,   // board width
  height: 28,   // board height
  apples : [],
  snakes : [],
  player : {},
  players : "",
  mode : "game",

  removePlayer : function(id){
    for(var i = 0 ; i < this.snakes.length; i++) {
      var snake = this.snakes[i];
      if(snake.id === id){
        var snakeIndex = this.snakes.indexOf(snake);
        this.snakes.splice(snakeIndex, 1);
      }
    }
  },
  start : function(data){
    this.addApple();
    this.addApple();
  },
  resetGame : function(){
    this.mode = "game";

    for(var i = 0; i < this.snakes.length; i++){
      var s = this.snakes[i];
      s.die();
    }
    // kill all the snakes
    // spawn all snakes...

    this.io.emit('gameMode', {
      mode : "game"
    });
  },
  endGame : function(){



  },
  move : function(){




    var winnerIDs = [];

    for(var i = 0 ; i < this.snakes.length; i++ ){
      var s = this.snakes[i];
      s.move();

      // console.log(this.players);

      if(this.mode == "game") {
        if(s.segments.length >= this.winLength) {
          var id = s.id;
          winnerIDs.push(s.id);
        }
      }
    }

    var that = this;

    if(this.mode == "game") {
      if(winnerIDs.length > 0){

        for(var i = 0; i < winnerIDs.length; i++){
          var winnerID = winnerIDs[i];
          this.players[winnerID].points++;
        }

        var sendPlayers = [];

        Object.keys(this.players).forEach(key => {
          sendPlayers.push({
            id: key,
            name: this.players[key].name,
            points : this.players[key].points
          })
        })

        this.io.emit('gameOver', {
          players : sendPlayers,
          winner : winnerIDs[0]
        });

        this.mode = "winner"
        setTimeout(function(){
          that.resetGame();
        },5000)
      }
    }

  },
  addSnake : function(data){
    var snakeDetails = {
      id : data.id,
      x: (Math.random() * this.width)  | 0,
      y: (Math.random() * this.height)  | 0,
      color: data.color,
      length: this.size,
    }

    this.io.emit('spawnSnake', snakeDetails);

    var snake = new Snake(snakeDetails, this);
    snake.init();
    this.snakes.push(snake);

    if(this.apples.length == 0) {
      this.addApple();
      this.addApple();
    }
  },

  addApple : function(){
    var apple = {
      x : getRandom(0,this.width - 1),
      y : getRandom(0,this.height - 1),
      id: uuid()
    };
    this.io.emit('addApple', apple);
    this.apples.push(apple);
  },

  removeApple: function(apple){
    var appleIndex = this.apples.indexOf(apple);
    this.apples.splice(appleIndex, 1);
    this.io.emit('removeApple', apple.id);
  },

  checkCollisions(){
    //Checks collisions between apples and snakes
    for(var i = 0; i < this.snakes.length; i++){
      var snake = this.snakes[i];
      var head = snake.segments[snake.segments.length - 1];

      for(var j = 0; j < this.apples.length; j++) {
        var apple = this.apples[j];
        if(collider(apple, head)){
          snake.eat();
          this.removeApple(apple);
          this.addApple();
        }
      }
    }
  }
};

module.exports = function(io, players) {
  var game = new Game(io,players);
  var totalFrames = 0;
  var avgFrame = 0;
  var time = new Date().getTime();
  var elapsedHistory = [];
  var elapsed = 0;
  var ms = 80;

  function move(){
    var now = new Date().getTime();
    var delta = now - time;
    time = now;
    elapsed = elapsed + delta;

    while(elapsed >= ms) {
      io.emit('serverTick', {
        message: elapsed,
        snakes : game.snakes
       });
      elapsed = elapsed - ms;
      totalFrames++;
      game.move();
    }

    setTimeout(move,1);
  }

  move();

  return game;
};