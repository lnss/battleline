import { INVALID_MOVE } from 'boardgame.io/core';

var DEFAULT_TROOP_DECK = new Array();
var TROOP_DECK_COLORS = ["r","o","y","g","b","p"];
var TROOP_DECK_VALUES = ["1","2","3","4","5","6","7","8","9","T"];
var VALUE_MAP = new Map([["1",1],["2",2],["3",3],["4",4],["5",5],["6",6],["7",7],["8",8],["9",9],["T",10]]);
var FORMATION_STRENGTH_MAP = new Map([["straightflush",5],["set",4],["flush",3],["straight",2],["sum",1],["incomplete",0]]);


for(var i = 0; i != 10; i++){
  for(var j = 0; j != 6; j++){
    var card = TROOP_DECK_VALUES[i]+TROOP_DECK_COLORS[j];
    DEFAULT_TROOP_DECK.push(card);
  }
}

var troop_deck = DEFAULT_TROOP_DECK.slice();
shuffle_array(troop_deck);

var DEFAULT_TACTICS_DECK = ["ALX","DAR","CAV","321","TRA","DES","RDP","SCT","FOG","MUD"];
var tactics_deck = DEFAULT_TACTICS_DECK.slice();
shuffle_array(tactics_deck);

var player_hands = new Array();
player_hands.push(new Array());
player_hands.push(new Array());

for(var i = 0; i != 7; i++){
  for(var j = 0; j != 2; j++){
    player_hands[j].push(troop_deck.pop()); 
  }
}

var board_cards = new Array(9).fill(new Array(2).fill(new Array()))
var unseen_cards = DEFAULT_TROOP_DECK.slice();

var flag_statuses = new Array(9).fill(null);

export const BattleLine = {
  name: "battle-line",
  setup: () => ({ troop_deck: troop_deck,
                  tactics_deck: tactics_deck,
                  player_hands: player_hands,
                  board_cards: board_cards,
                  unseen_cards: unseen_cards,
                  flag_statuses: flag_statuses
                }),
  minPlayers: 2,
  maxPlayers: 2,
  moves: {
    playCard: (G, ctx, card, flag) => {
      if (ctx.numMoves > 0){
        return INVALID_MOVE;
      }
      if (G.board_cards[flag][ctx.currentPlayer].length == 3){
        return INVALID_MOVE;
      }
      if (G.flag_statuses[flag] != null){
        return INVALID_MOVE;
      }
      G.board_cards[flag][ctx.currentPlayer].push(G.player_hands[ctx.currentPlayer][card]);
      var ind = G.unseen_cards.indexOf(G.player_hands[ctx.currentPlayer][card]);
      if (ind != -1){
        G.unseen_cards.splice(ind,1);
      }
      G.player_hands[ctx.currentPlayer].splice(card, 1);
    },
    claimFlag: (G, ctx, flag) => {
      if (ctx.numMoves == 0){
        return INVALID_MOVE;
      }
      if (G.flag_statuses[flag] != null){
        return INVALID_MOVE;
      }
      var formations = getFormations(flag, ctx.currentPlayer, G.board_cards);
      if (!isStrongestFormation(formations[0], formations[1], G.unseen_cards)){
        return INVALID_MOVE;
      }
      G.flag_statuses[flag] = ctx.currentPlayer;
    },
    drawCard: (G, ctx, deck) => {
      if (ctx.numMoves == 0){
        return INVALID_MOVE;
      }
      G.player_hands[ctx.currentPlayer].push(troop_deck.pop());
      ctx.events.endTurn();
    }
  },

  // moves: {
    

  // },
  endIf: (G, ctx) => {
    if (IsVictory(G.flag_statuses, ctx.currentPlayer)) {
      return { winner: ctx.currentPlayer};
    }
  },
};

// Return true if `cells` is in a winning configuration.
function IsVictory(flag_statuses, player_id) {
  var count = 0;
  var count_consecutive = 0;
  for (var i = 0; i != 9; i++){
    if (flag_statuses[i] == player_id){
      count++;
      count_consecutive++;
    }
    else{
      count_consecutive = 0;
    }
    if (count >= 5 || count_consecutive >= 3){
      return true;
    }
  }
  return false;
}

function getFormations(flag, player_id, board_cards){
  var formation = [];
  var formation_opp = [];
  for(var i = 0; i != 2; i++){
    for(var j = 0; j != board_cards[flag][i].length; j++){
      if(i == player_id){
        formation.push(board_cards[flag][i][j]);
      }
      else {
        formation_opp.push(board_cards[flag][i][j]);
      }
    }
  }
  return [formation, formation_opp];
}

function isStrongestFormation(formation, formation_opp, unseen_cards){
  var remaining_cards = new Set(DEFAULT_TROOP_DECK);
  for(var i = 0; i != 9; i++){
    for(var j = 0; j != 2; j++){
      for(var k = 0; k != board_cards[i][j].length; k++){
        remaining_cards.delete(board_cards[i][j][k]);
      }
    }
  }
  var formation_strength = formationStrength(formation);
  var formation_strength_opp = potentialFormationStrength(formation_opp, unseen_cards);

  return formationStrengthComparison(formation_strength, formation_strength_opp);
}

function formationStrengthComparison(formation_strength1, formation_strength2){
  if (FORMATION_STRENGTH_MAP.get(formation_strength1[0]) > FORMATION_STRENGTH_MAP.get(formation_strength2[0])){
    return true;
  }
  else if (FORMATION_STRENGTH_MAP.get(formation_strength1[0]) < FORMATION_STRENGTH_MAP.get(formation_strength2[0])){
    return false;
  }
  else if (formation_strength1[1] >= formation_strength2[1]){
    return true;
  }
  else{
    return false;
  }
}

function formationStrength(formation){
  var formation_sum = formationSum(formation);
  if (formation.length != 3){
    return ['incomplete', formation_sum];
  }
  var is_flush = isFlush(formation);
  var is_straight = isStraight(formation);
  var is_set = isSet(formation);
  if (is_flush && is_straight){
    return ['straightflush', formation_sum];
  }
  else if (is_set){
    return ['set', formation_sum];
  }
  else if (is_flush){
    return ['flush', formation_sum];
  }
  else if (is_straight){
    return ['straight', formation_sum];
  }
  else{
    return ['sum', formation_sum];
  }
}

function formationSum(formation){
  var sum = 0;
  for (var i = 0; i != formation.length; i++){
    sum += VALUE_MAP.get(formation[i][0]);
  }
  return sum;
}

function isFlush(formation){
  var color = null;
  for (var i = 0; i != formation.length; i++){
    if (color == null){
      color = formation[i][1];
    }
    else if(color != formation[i][1]){
      return false;
    }
  }
  return true;
}
function isStraight(formation){
  for (var i = 0; i != formation.length; i++){
    for (var j = i+1; j != formation.length; j++){
      var diff = Math.abs(VALUE_MAP.get(formation[i][0]) - VALUE_MAP.get(formation[j][0]));
      if (diff == 0 || diff >= 3){
        return false;
      }  
    }
  }
  return true;
}
function isSet(formation){
  var value = null;
  for (var i = 0; i != formation.length; i++){
    if (value == null){
      value = formation[i][0];
    }
    else if(value != formation[i][0]){
      return false;
    }
  }
  return true;
}

function potentialFormationStrength(formation, unseen_cards){
  var pot = potentialStraightFlush(formation, unseen_cards);
  if (pot != -1){
    return ['straightflush', pot];
  }
  var pot = potentialSet(formation, unseen_cards);
  if (pot != -1){
    return ['set', pot];
  }
  var pot = potentialFlush(formation, unseen_cards);
  if (pot != -1){
    return ['flush', pot];
  }
  var pot = potentialStraight(formation, unseen_cards);
  if (pot != -1){
    return ['straight', pot];
  }
  var pot = potentialSum(formation, unseen_cards);
  if (pot != -1){
    return ['sum', pot];
  }
  return ['incomplete', pot];
}

function potentialStraightFlush(formation, unseen_cards, ind = null){
  if (ind == null){
    ind = unseen_cards.length;
  }
  if (!(isFlush(formation) && isStraight(formation))){
    return -1;
  }
  if (formation.length == 3){
    return formationSum(formation);
  }
  for(var i = ind - 1; i >= 0; i--){
    var formation_new = formation.slice();
    var unseen_cards_new = unseen_cards.slice();
    formation_new.push(unseen_cards[i]);
    unseen_cards_new.splice(i, 1);
    var pot = potentialStraightFlush(formation_new, unseen_cards_new, i);
    if (pot != -1){
      return pot;
    }
  }
  return -1;
}
function potentialSet(formation, unseen_cards, ind = null){
  if (ind == null){
    ind = unseen_cards.length;
  }
  if (!isSet(formation)){
    return -1;
  }
  if (formation.length == 3){
    return formationSum(formation);
  }
  for(var i = ind - 1; i >= 0; i--){
    var formation_new = formation.slice();
    var unseen_cards_new = unseen_cards.slice();
    formation_new.push(unseen_cards[i]);
    unseen_cards_new.splice(i, 1);
    var pot = potentialSet(formation_new, unseen_cards_new, i);
    if (pot != -1){
      return pot;
    }
  }
  return -1;
}
function potentialFlush(formation, unseen_cards, ind = null){
  if (ind == null){
    ind = unseen_cards.length;
  }
  if (!isFlush(formation)){
    return -1;
  }
  if (formation.length == 3){
    return formationSum(formation);
  }
  for(var i = ind - 1; i >= 0; i--){
    var formation_new = formation.slice();
    var unseen_cards_new = unseen_cards.slice();
    formation_new.push(unseen_cards[i]);
    unseen_cards_new.splice(i, 1);
    var pot = potentialFlush(formation_new, unseen_cards_new, i);
    if (pot != -1){
      return pot;
    }
  }
  return -1;
}
function potentialStraight(formation, unseen_cards, ind = null){
  if (ind == null){
    ind = unseen_cards.length;
  }
  if (!isStraight(formation)){
    return -1;
  }
  if (formation.length == 3){
    return formationSum(formation);
  }
  for(var i = ind - 1; i >= 0; i--){
    var formation_new = formation.slice();
    var unseen_cards_new = unseen_cards.slice();
    formation_new.push(unseen_cards[i]);
    unseen_cards_new.splice(i, 1);
    var pot = potentialStraight(formation_new, unseen_cards_new, i);
    if (pot != -1){
      return pot;
    }
  }
  return -1;
}
function potentialSum(formation, unseen_cards, ind = null){
  if (ind == null){
    ind = unseen_cards.length;
  }
  if (formation.length == 3){
    return formationSum(formation);
  }
  for(var i = ind - 1; i >= 0; i--){
    var formation_new = formation.slice();
    var unseen_cards_new = unseen_cards.slice();
    formation_new.push(unseen_cards[i]);
    unseen_cards_new.splice(i, 1);
    var pot = potentialSum(formation_new, unseen_cards_new, i);
    if (pot != -1){
      return pot;
    }
  }
  return -1;
}

function shuffle_array(arr){
  for(var i = arr.length-1; i >= 0; i--){
    var k = Math.floor(Math.random()*(i+1));
    var temp = arr[k];
    arr[k] = arr[i];
    arr[i] = temp;
  }
}
