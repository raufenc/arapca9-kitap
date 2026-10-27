function ExecuteScript(strId)
{
  switch (strId)
  {
      case "6JRPXo6xGnr":
        Script1();
        break;
      case "5sUvvKGEhi4":
        Script2();
        break;
      case "5i7tYaXmWHA":
        Script3();
        break;
      case "6G6rJ87OOKP":
        Script4();
        break;
      case "6BokFYt5ZZl":
        Script5();
        break;
      case "6Gf6wTSojD1":
        Script6();
        break;
      case "6XxtBhg5TDQ":
        Script7();
        break;
      case "6egXYpoi8fi":
        Script8();
        break;
      case "6SBA4x2aOxp":
        Script9();
        break;
  }
}

window.InitExecuteScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
window.Script1 = function()
{
  const target = object('6N3YWuZhRr7');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6ADbJf0VWIy';
const growAmount = 1.2;
player.addForTriggers(
id,
target.animate(
player.emphasis.elastic(growAmount)
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script2 = function()
{
  const target = object('5iJ38B1DWNo');
const duration = 750;
const easing = 'ease-out';
const id = '5ma0fCR9Zyi';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script3 = function()
{
  const target = object('6C9KCDJ1vA9');
const duration = 750;
const easing = 'ease-out';
const id = '67Lf2BTODJV';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script4 = function()
{
  const target = object('5k6t25ZA4Ih');
const duration = 750;
const easing = 'ease-out';
const id = '6WvCw1F8eZy';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script5 = function()
{
  const target = object('6gR6dHtQqFu');
const duration = 750;
const easing = 'ease-out';
const id = '5sbyE0ZUmkL';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script6 = function()
{
  const target = object('6CLBipBYSXm');
const duration = 750;
const easing = 'ease-out';
const id = '6QSfIJE73Ig';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script7 = function()
{
  const target = object('5xPuMDEpbi6');
const duration = 750;
const easing = 'ease-out';
const id = '6UxkUAjq3rv';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script8 = function()
{
  const target = object('68n4ReUfL7b');
const duration = 750;
const easing = 'ease-out';
const id = '6oH2wRibgDn';
const teeterAmount = 10;
player.addForTriggers(
id,
target.animate(
[ {rotate: '0deg' }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: `${teeterAmount}deg` }, 
{rotate: `-${teeterAmount}deg` }, 
{rotate: '0deg' } ]
,
  { fill: 'forwards', duration, easing }
)
);
}

window.Script9 = function()
{
  const target = object('6N3YWuZhRr7');
const duration = 750;
const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
const id = '6ADbJf0VWIy';
const growAmount = 1.2;
player.addForTriggers(
id,
target.animate(
player.emphasis.elastic(growAmount)
,
  { fill: 'forwards', duration, easing }
)
);
}

};
