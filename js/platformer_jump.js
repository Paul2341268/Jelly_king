// ========================================
// Platformer Jump 게임 JavaScript 코드
// (6.2단계: '운석 Y좌표' 버그 수정)
// ========================================

// ========================================
// Canvas 설정
// ========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ========================================
// 게임 상태 및 카메라 변수
// ========================================
let gameState = "START_MENU"; 
let cameraY = 0;              
let lastTime = 0; // 델타 타임 계산용

// ========================================
// 게임 설정 변수 (px/sec)
// ========================================
const maxJumpHeight = 125;    
const MIN_PLATFORM_Y_DIST = 70; 
const MAX_PLATFORM_Y_DIST = 120;
const maxHorizontalChange = 150; 
const movingPlatformSpeed = 90;   
const enemyMoveSpeed = 100; 
const playerMoveSpeed = 200;  

// ========================================
// 이미지 객체 선언 및 로드
// ========================================
const images = {};
let imagesLoaded = 0;
let totalImages = 7; // ❤️ 학생님이 meteor.png를 추가하셨으므로 7로 설정

function loadImage(name, src) {
  images[name] = new Image();
  images[name].onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      lastTime = performance.now();
      update(performance.now()); 
    }
  };
  images[name].src = `images/${src}`; 
}

loadImage("background", "background.png");
loadImage("player_slime", "slime.png"); 
loadImage("platform_cloud", "cloud.png");
loadImage("platform_breaking", "platform_breaking.png");
loadImage("platform_rainbow", "platform_rainbow.png");
loadImage("eilen_2", "eilen_2.png"); 
loadImage("meteor_image", "meteor.png"); // ❤️ '운석' 이미지


// ========================================
// 게임 객체 변수
// ========================================
let player = {
  x: 180, y: 500, width: 40, height: 40,
  xSpeed: 0, 
  ySpeed: 0, 
  jumpPower: -600, 
  gravity: 1800, 
  grounded: false, 
  standingOnPlatform: null,
  isInvincible: false,   
  invincibleTimer: 0 
};
let platforms = [];
let lastPlatformY = 0; 
let lastPlatformX = 0; 
let enemies = [];
let lastEnemyY = 0; 
let score = 0;
let maxScore = 0;

// ========================================
// 키보드 입력 처리
// ========================================
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ========================================
// 몬스터 생성/제거 함수
// ========================================

function generateNewEnemies() {
  const generationTriggerY = cameraY - 50; 
  while (lastEnemyY > generationTriggerY) {
    const yDist = Math.random() * 100 + 200; 
    const newY = lastEnemyY - yDist;
    
    let newType = "";
    let newWidth = 0;
    let newHeight = 0;
    let newDirection = 0;
    let newMoveSpeed = 0;
    let newYSpeed = 0; 

    if (Math.random() < 0.5) { 
      newType = "horizontal";
      newWidth = 70;
      newHeight = 60;
      newDirection = (Math.random() < 0.5) ? 1 : -1;
      newMoveSpeed = enemyMoveSpeed;
    } else {
      newType = "meteor_trap";
      newWidth = 60; // ❤️ 운석 크기 (이미지에 맞게 조절하세요)
      newHeight = 60; // ❤️ 운석 크기
    }

    const newX = Math.random() * (canvas.width - newWidth);

    enemies.push({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      type: newType,
      moveSpeed: newMoveSpeed,
      direction: newDirection,
      ySpeed: newYSpeed,
      isWarning: false, 
      warningTimer: 0, 
      isFalling: false, 
      isDestroyed: false 
    });

    lastEnemyY = newY;
  }
}

function removeOldEnemies() {
  const removalPoint = cameraY + canvas.height + 200; 
  enemies = enemies.filter(e => e.y < removalPoint);
}

function removeDestroyedEnemies() {
  enemies = enemies.filter(e => !e.isDestroyed);
}

// ========================================
// 플랫폼 생성/제거
// ========================================
function generateNewPlatforms() {
  const generationTriggerY = cameraY - 50; 
  while (lastPlatformY > generationTriggerY) {
    const yDist = Math.random() * (MAX_PLATFORM_Y_DIST - MIN_PLATFORM_Y_DIST) + MIN_PLATFORM_Y_DIST;
    const newY = lastPlatformY - yDist;
    
    let newType = "normal";
    let newMoveSpeed = 0;
    let newDirection = 0;
    let newWidth = 90; 
    let newHeight = 60; 

    let rand = Math.random();
    if (rand < 0.15) { 
      newType = "moving";
      newMoveSpeed = movingPlatformSpeed;
      newDirection = (Math.random() < 0.5) ? 1 : -1;
    } else if (rand < 0.25) { 
      newType = "rainbow";
      newWidth = 120; 
      newHeight = 60;
    } else if (rand < 0.35) { 
      newType = "breaking";
      newWidth = 90; 
      newHeight = 70; 
    }
    
    const changeX = (Math.random() * maxHorizontalChange * 2) - maxHorizontalChange; 
    let newX = lastPlatformX + changeX;
    const maxPlatformX = canvas.width - newWidth; 
    if (newX < 0) {
        newX = -newX; 
    } else if (newX > maxPlatformX) {
        newX = maxPlatformX - (newX - maxPlatformX);
    }

    platforms.push({
      x: newX,
      y: newY,
      width: newWidth,  
      height: newHeight, 
      type: newType,
      moveSpeed: newMoveSpeed,
      direction: newDirection,
      isBroken: false, 
      breakTimer: 0 
    });

    lastPlatformY = newY;
    lastPlatformX = newX;
  }
}

function removeOldPlatforms() {
  const removalPoint = cameraY + canvas.height + 200; 
  platforms = platforms.filter(p => p.y < removalPoint);
}

function removeBrokenPlatforms() {
  platforms = platforms.filter(p => !p.isBroken);
}

// ========================================
// 게임 초기화/재시작 함수
// ========================================
function resetGame() {
  player.ySpeed = 0;
  player.grounded = false;
  player.standingOnPlatform = null; 
  player.isInvincible = false; 
  player.invincibleTimer = 0; 

  cameraY = 0;
  score = 0;
  maxScore = Math.max(maxScore, score); 

  platforms = [];
  enemies = []; 
  
  const startPlatformWidth = 90;
  const startPlatformHeight = 60;
  const startPlatformY = canvas.height - 50;
  const startPlatformX = (canvas.width / 2) - (startPlatformWidth / 2);
  
  platforms.push({
    x: startPlatformX,
    y: startPlatformY,
    width: startPlatformWidth, 
    height: startPlatformHeight, 
    type: "normal",
    moveSpeed: 0, 
    direction: 0,
    isBroken: false,
    breakTimer: 0 
  });

  lastPlatformY = startPlatformY;
  lastPlatformX = startPlatformX; 
  lastEnemyY = startPlatformY - 200; 

  player.height = 40;
  player.width = 40;
  player.y = startPlatformY - player.height;
  player.x = (canvas.width / 2) - (player.width / 2);

  generateNewPlatforms();
  generateNewEnemies(); 
}

// ========================================
// 그리기 함수
// ========================================

function drawBackground() {
  const bgImage = images.background;
  if (!bgImage || !bgImage.complete) return; 
  let yOffset = (-cameraY % bgImage.height);
  if (yOffset > 0) yOffset -= bgImage.height;
  for (let y = yOffset; y < canvas.height; y += bgImage.height) {
    ctx.drawImage(bgImage, 0, y, canvas.width, bgImage.height);
  }
}

function drawPlayer() {
  if (player.isInvincible && player.invincibleTimer % 0.2 < 0.1) {
    return; 
  }
  const slimeImage = images.player_slime; 
  if (!slimeImage || !slimeImage.complete) { 
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y - cameraY, player.width, player.height);
    return;
  }
  ctx.drawImage(slimeImage, player.x, player.y - cameraY, player.width, player.height);
}

function drawPlatforms() {
  platforms.forEach(p => {
    let platformImage = null;
    if (p.type === "moving" || p.type === "normal") {
      platformImage = images.platform_cloud;
    } else if (p.type === "rainbow") {
      platformImage = images.platform_rainbow;
    } else if (p.type === "breaking") {
      platformImage = images.platform_breaking;
    }
    if (!platformImage || !platformImage.complete) return; 

    ctx.save(); 
    ctx.drawImage(platformImage, p.x, p.y - cameraY, p.width, p.height);
    if (p.type === "breaking" && p.breakTimer > 0) {
      if (p.breakTimer % 0.2 < 0.1) { 
        ctx.globalCompositeOperation = 'source-atop'; 
        ctx.fillStyle = "rgba(255, 0, 0, 0.4)"; 
        ctx.fillRect(p.x, p.y - cameraY, p.width, p.height);
      }
    }
    ctx.restore(); 
  });
}

// ❤️ 몬스터 그리기 (운석 이미지)
function drawEnemies() {
  enemies.forEach(e => {
    let enemyImage;

    if (e.type === "horizontal") {
      enemyImage = images.eilen_2;
    } else if (e.type === "meteor_trap") {
      enemyImage = images.meteor_image; // ❤️ '운석' 이미지 사용
    }

    if (!enemyImage || !enemyImage.complete) return;
    
    ctx.save();
    
    let drawX = e.x;
    let drawY = e.y - cameraY;

    // 1. 운석 '경고' 그리기
    if (e.type === "meteor_trap" && e.isWarning) {
      if (e.warningTimer % 1.0 < 0.5) { 
        ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        ctx.fillRect(e.x + e.width / 2 - 3, 0, 6, canvas.height);
      }
    }
    // 2. 운석 '낙하'
    else if (e.type === "meteor_trap" && e.isFalling) {
      ctx.drawImage(enemyImage, drawX, drawY, e.width, e.height);
    }
    // 3. '좌우 몬스터'
    else if (e.type === "horizontal") {
      if (e.direction === 1) {
        ctx.translate(drawX + e.width, drawY); 
        ctx.scale(-1, 1); 
        ctx.drawImage(enemyImage, 0, 0, e.width, e.height); 
      } else {
        ctx.drawImage(enemyImage, drawX, drawY, e.width, e.height);
      }
    }
    
    ctx.restore();
  });
}

function drawUI() {
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  score = Math.floor(Math.max(0, -cameraY) / 10);
  maxScore = Math.max(maxScore, score); 
  ctx.fillText("Score: " + score, 10, 20);
}

// ========================================
// 상태별 화면 그리기
// ========================================
function drawStartMenu() {
  drawBackground(); 
  ctx.fillStyle = "black";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("젤리 킹", canvas.width / 2, 150);
  ctx.font = "20px Arial";
  ctx.fillText("Press 'Enter' to Start", canvas.width / 2, 300);
  ctx.textAlign = "left"; 
}
function drawGameOver() {
  drawBackground();
  ctx.fillStyle = "black";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, 150);
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width / 2, 200);
  ctx.fillText("High Score: " + maxScore, canvas.width / 2, 230); 
  ctx.fillText("Press 'Enter' to Restart", canvas.width / 2, 300);
  ctx.textAlign = "left"; 
}

// ========================================
// 게임 로직 함수
// ========================================

function updatePlayerState(dt) {
  if (player.isInvincible) {
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt; 
    } else {
      player.isInvincible = false;
    }
  }
}

function updatePlayerMovement(dt) {
  if (keys["ArrowLeft"]) player.x -= playerMoveSpeed * dt; 
  if (keys["ArrowRight"]) player.x += playerMoveSpeed * dt; 

  if (player.x + player.width < 0) {
    player.x = canvas.width;
  } else if (player.x > canvas.width) {
    player.x = 0 - player.width;
  }

  player.ySpeed += player.gravity * dt; 
  player.y += player.ySpeed * dt; 
  
  if (player.grounded && keys[" "]) {
    player.ySpeed = player.jumpPower;
    player.grounded = false;
    player.standingOnPlatform = null; 
  }

  if (player.grounded && player.standingOnPlatform && player.standingOnPlatform.type === "moving") {
    player.x += player.standingOnPlatform.moveSpeed * player.standingOnPlatform.direction * dt; 
  }
}

function checkEnemyCollision() {
  enemies.forEach(e => {
    if (e.isDestroyed) return; 

    const isColliding = 
      player.x < e.x + e.width &&
      player.x + player.width > e.x &&
      player.y < e.y + e.height &&
      player.y + player.height > e.y;
      
    if (isColliding) {
      if (player.isInvincible) {
        e.isDestroyed = true;
      } else {
        gameState = "GAME_OVER";
      }
    }
  });
}

function checkPlatformCollision() {
  player.grounded = false;
  
  platforms.forEach(p => {
    if (p.isBroken) return; 

    const isColliding =
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      player.y + player.height > p.y &&
      player.y + player.height < p.y + p.height && 
      player.ySpeed > 0;

    if (isColliding) {
      if (p.type === "rainbow") {
        player.ySpeed = player.jumpPower * 2.5; 
        player.grounded = false;
        player.standingOnPlatform = null;
        player.isInvincible = true; 
        player.invincibleTimer = 1.5; 
      } else {
        player.y = p.y - player.height;
        player.ySpeed = 0;
        player.grounded = true;
        player.standingOnPlatform = p; 

        if (p.type === "breaking" && p.breakTimer <= 0) { 
          p.breakTimer = 0.5; 
        }
      }
    }
  });
}

function checkGameOver() {
  if (player.y > cameraY + canvas.height) {
    return true; 
  }
  return false; 
}

function updateCamera() {
  const scrollTriggerPoint = canvas.height * 0.4;
  const playerScreenY = player.y - cameraY;
  if (playerScreenY < scrollTriggerPoint) {
    cameraY = player.y - scrollTriggerPoint;
  }
}

// ❤️ 몬스터 업데이트 (운석 Y좌표 리셋)
function updateEnemies(dt) {
  enemies.forEach(e => {
    
    if (e.type === "horizontal") {
      e.x += e.moveSpeed * e.direction * dt; 
      if (e.x < 0) {
        e.x = 0;
        e.direction *= -1; 
      } else if (e.x + e.width > canvas.width) {
        e.x = canvas.width - e.width;
        e.direction *= -1; 
      }
    } else if (e.type === "meteor_trap") {
      
      if (!e.isWarning && !e.isFalling) {
        // A. 발동 (화면에 보이면)
        const isVisible = e.y < cameraY + canvas.height && e.y + e.height > cameraY;
        if (isVisible) {
          e.isWarning = true;
          e.warningTimer = 3.0; // 3초 경고
        }
      } else if (e.isWarning) {
        // B. 경고 (깜빡임)
        e.warningTimer -= dt; 
        if (e.warningTimer <= 0) {
          e.isWarning = false;
          e.isFalling = true;
          e.ySpeed = 300; // 초기 낙하 속도
          
          // ❤️ Y좌표 리셋 (버그 수정)
          // 현재 카메라의 맨 위(-e.height)로 Y좌표를 강제 이동
          e.y = cameraY - e.height; 
        }
      } else if (e.isFalling) {
        // C. 낙하
        e.ySpeed += player.gravity * 0.5 * dt; 
        e.y += e.ySpeed * dt; 
      }
    }
  });
}

function updatePlatforms(dt) {
  platforms.forEach(p => {
    if (p.type === "moving") {
      p.x += p.moveSpeed * p.direction * dt; 
      if (p.x < 0) {
        p.x = 0;
        p.direction *= -1;
      } else if (p.x + p.width > canvas.width) {
        p.x = canvas.width - p.width;
        p.direction *= -1;
      }
    }

    if (p.type === "breaking" && p.breakTimer > 0) { 
      p.breakTimer -= dt; 
      if (p.breakTimer <= 0) {
        p.isBroken = true; 
      }
    }
  });
}

// ========================================
// 게임 상태별 로직/그리기 묶음
// ========================================

function updatePlaying(dt) {
  updatePlayerState(dt); 
  updatePlayerMovement(dt);
  updatePlatforms(dt); 
  updateEnemies(dt); 
  
  checkPlatformCollision();
  checkEnemyCollision(); 
  
  updateCamera(); 
  
  generateNewPlatforms(); 
  removeOldPlatforms();
  removeBrokenPlatforms(); 
  generateNewEnemies(); 
  removeOldEnemies(); 
  removeDestroyedEnemies(); 

  if (checkGameOver()) { 
    gameState = "GAME_OVER";
  }
}

function drawPlaying() {
  drawBackground(); 
  drawPlatforms();
  drawEnemies(); 
  drawPlayer();
  drawUI();
}

// ========================================
// 게임 메인 루프 (Delta Time)
// ========================================
function update(currentTime) {
  if (imagesLoaded < totalImages) {
    if (lastTime === 0) { 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Loading Images... (${imagesLoaded}/${totalImages})`, canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(update); 
    }
    return;
  }
  
  if (lastTime === 0) lastTime = currentTime; 
  const deltaTime = (currentTime - lastTime) / 1000.0;
  lastTime = currentTime;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  switch (gameState) {
    case "START_MENU":
      drawStartMenu();
      if (keys["Enter"]) {
        gameState = "PLAYING";
        resetGame(); 
      }
      break;
    case "PLAYING":
      updatePlaying(deltaTime); 
      drawPlaying();   
      break;
    case "GAME_OVER":
      drawGameOver();
      if (keys["Enter"]) {
        gameState = "START_MENU";
      }
      break;
  }
  if (keys["Enter"]) {
    keys["Enter"] = false;
  }
  
  requestAnimationFrame(update); 
}

// ========================================
// 게임 시작
// ========================================
update(performance.now());