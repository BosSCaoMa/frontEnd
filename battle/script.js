// 默认游戏初始状态
const defaultState = {
  player: {
    name: "星野·主角",
    level: 10,
    power: 0, // 会动态计算
    silver: 5000,
    gold: 120,
    hp: 100,
    maxHp: 100,
    energy: 60,
    maxEnergy: 100,
  },
  hero: {
    name: "星野·主角",
    level: 10,
    basePower: 3000,
    weaponId: null,
    armorId: null,
    mountId: null,
    skills: [],
  },
  allies: [
    { name: "青萝", role: "副将 · 输出", level: 9 },
    { name: "玄甲", role: "副将 · 防御", level: 9 },
    { name: "灵狸", role: "宠物 · 辅助", level: 8 },
  ],
  bag: [
    { itemId: "swdIron", qty: 1 },
    { itemId: "armorLeather", qty: 1 },
    { itemId: "mountHorse", qty: 1 },
    { itemId: "potionSmall", qty: 3 },
  ],
  shopStock: [
    { itemId: "swdMoon", qty: 1 },
    { itemId: "armorDragon", qty: 1 },
    { itemId: "mountDragon", qty: 1 },
    { itemId: "potionEnergy", qty: 99 },
  ],
  dungeon: {
    currentWorldIndex: 0,
    currentStageIndex: 0,
  },
  events: [
    {
      id: "login",
      title: "每日登录奖励",
      desc: "今日首次登录游戏，获得奖励。",
      reward: { silver: 500, gold: 5, energy: 10 },
      completed: true,
      claimed: false,
    },
    {
      id: "dungeonOnce",
      title: "初试锋芒",
      desc: "任意难度完成 1 次副本战斗。",
      reward: { silver: 700, gold: 10, energy: 0 },
      completed: false,
      claimed: false,
    },
    {
      id: "powerTarget",
      title: "强者之路",
      desc: "战斗力突破 6000。",
      reward: { silver: 1500, gold: 20, energy: 0 },
      completed: false,
      claimed: false,
    },
  ],
};

// 静态配置数据（不随存档改变）
const gameData = {
  items: {
    swdIron: { id: "swdIron", name: "铁刃长剑", type: "weapon", power: 400, priceGold: 30, priceSilver: 0 },
    swdMoon: { id: "swdMoon", name: "月影之刃", type: "weapon", power: 900, priceGold: 80, priceSilver: 0 },
    armorLeather: { id: "armorLeather", name: "轻皮护甲", type: "armor", power: 300, priceGold: 20, priceSilver: 0 },
    armorDragon: { id: "armorDragon", name: "龙鳞战甲", type: "armor", power: 1100, priceGold: 110, priceSilver: 0 },
    mountHorse: { id: "mountHorse", name: "青风骏马", type: "mount", power: 300, priceGold: 25, priceSilver: 0 },
    mountDragon: { id: "mountDragon", name: "苍穹龙翼", type: "mount", power: 1500, priceGold: 160, priceSilver: 0 },
    potionSmall: { id: "potionSmall", name: "小型治疗药水", type: "consumable", power: 0, priceGold: 0, priceSilver: 80 },
    potionEnergy: { id: "potionEnergy", name: "精力药剂", type: "consumable", power: 0, priceGold: 0, priceSilver: 100 },
  },
  skillsPool: [
    { id: "skillSlash", name: "星落斩" },
    { id: "skillGuard", name: "灵盾守护" },
    { id: "skillBurst", name: "流光爆发" },
    { id: "skillHeal", name: "月华治愈" },
  ],
  worlds: [
    {
      name: "晨曦平原",
      stages: [
        { name: "1-1 林间小道", recommendedPower: 800 },
        { name: "1-2 失落营地", recommendedPower: 1500 },
        { name: "1-3 平原之王", recommendedPower: 2500 },
      ],
    },
    {
      name: "星辉高地",
      stages: [
        { name: "2-1 悬崖边缘", recommendedPower: 3500 },
        { name: "2-2 星光密林", recommendedPower: 5000 },
        { name: "2-3 高地霸主", recommendedPower: 7000 },
      ],
    },
  ]
};

// 当前游戏状态
let gameState = JSON.parse(JSON.stringify(defaultState));
let toastTimer = null;

// ==================== 核心逻辑 ====================

function getItem(itemId) {
  return gameData.items[itemId];
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// 存档系统
function saveGame() {
  localStorage.setItem("rpg_demo_save", JSON.stringify(gameState));
  showToast("✅ 游戏存档成功！");
}

function loadGame() {
  const saved = localStorage.getItem("rpg_demo_save");
  if (saved) {
    gameState = JSON.parse(saved);
    showToast("📂 读取存档成功！");
    refreshAllUI();
  } else {
    showToast("❌ 未找到存档记录。");
  }
}

// 界面刷新总控
function refreshAllUI() {
  updateStatsUI();
  updateLineupUI();
  initSelects();
  renderInventory();
  updateDungeonUI();
  renderEvents();
}

// 导航切换
function setActivePage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.dataset.page === pageId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// 属性 UI
function updateStatsUI() {
  const p = gameState.player;
  
  // 顶部与侧栏通用数据
  const elements = [
    { id: "player-name", val: p.name },
    { id: "side-level", val: p.level },
    { id: "side-power", val: p.power },
    { id: "side-silver", val: p.silver },
    { id: "side-gold", val: p.gold },
    { id: "stat-level", val: p.level },
    { id: "stat-power", val: p.power },
    { id: "stat-silver", val: p.silver },
    { id: "stat-gold", val: p.gold },
  ];

  elements.forEach(el => {
    const dom = document.getElementById(el.id);
    if(dom) dom.textContent = el.val;
  });

  // 进度条
  const hpPercent = (p.hp / p.maxHp) * 100;
  const energyPercent = (p.energy / p.maxEnergy) * 100;

  document.getElementById("side-hp-text").textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById("side-energy-text").textContent = `${p.energy}/${p.maxEnergy}`;
  document.getElementById("side-hp-bar").style.width = `${hpPercent}%`;
  document.getElementById("side-energy-bar").style.width = `${energyPercent}%`;
}

// 阵容 UI
function updateLineupUI() {
  const hero = gameState.hero;
  const p = gameState.player;

  document.getElementById("main-hero-name").textContent = hero.name;
  document.getElementById("main-hero-level").textContent = hero.level;
  document.getElementById("main-hero-base-power").textContent = hero.basePower;

  const weapon = hero.weaponId ? getItem(hero.weaponId) : null;
  const armor = hero.armorId ? getItem(hero.armorId) : null;
  const mount = hero.mountId ? getItem(hero.mountId) : null;

  document.getElementById("main-hero-weapon").textContent = weapon ? `${weapon.name} (+${weapon.power})` : "未装备";
  document.getElementById("main-hero-armor").textContent = armor ? `${armor.name} (+${armor.power})` : "未装备";
  document.getElementById("main-hero-mount").textContent = mount ? `${mount.name} (+${mount.power})` : "未装备";

  const equipPower = (weapon?.power || 0) + (armor?.power || 0) + (mount?.power || 0);
  const totalHeroPower = hero.basePower + equipPower;
  
  document.getElementById("main-hero-total-power").textContent = totalHeroPower;

  // 更新主角总战力
  p.power = Math.round(totalHeroPower + 0.5 * p.level * 100);
  
  // 副将列表
  const allyList = document.getElementById("ally-list");
  allyList.innerHTML = "";
  gameState.allies.forEach((ally) => {
    const li = document.createElement("li");
    li.className = "ally-item";
    li.innerHTML = `<span class="ally-name">${ally.name}</span> <span class="ally-info">${ally.role} Lv.${ally.level}</span>`;
    allyList.appendChild(li);
  });

  // 技能
  const skillList = document.getElementById("skill-list");
  skillList.innerHTML = "";
  hero.skills.forEach((sk) => {
    const li = document.createElement("li");
    li.className = "tag";
    li.textContent = sk.name;
    skillList.appendChild(li);
  });
  
  updateStatsUI(); // 战力变化需刷新属性
}

// 填充下拉框
function initSelects() {
  const weaponSelect = document.getElementById("weapon-select");
  const armorSelect = document.getElementById("armor-select");
  const mountSelect = document.getElementById("mount-select");
  const skillSelect = document.getElementById("skill-select");

  function fillSelect(select, type, placeholder) {
    select.innerHTML = "";
    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = placeholder;
    select.appendChild(optEmpty);

    // 筛选背包中该类型的物品
    const bagItems = gameState.bag.map(slot => getItem(slot.itemId)).filter(item => item && item.type === type);
    // 去重，只显示背包里有的
    const uniqueItems = [...new Set(bagItems.map(i => i.id))].map(id => getItem(id));

    uniqueItems.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = `${item.name} (+${item.power})`;
      select.appendChild(opt);
    });
  }

  fillSelect(weaponSelect, "weapon", "选择武器");
  fillSelect(armorSelect, "armor", "选择护甲");
  fillSelect(mountSelect, "mount", "选择坐骑");

  skillSelect.innerHTML = "";
  const optSkill = document.createElement("option");
  optSkill.value = "";
  optSkill.textContent = "选择技能";
  skillSelect.appendChild(optSkill);
  gameData.skillsPool.forEach((sk) => {
    const opt = document.createElement("option");
    opt.value = sk.id;
    opt.textContent = sk.name;
    skillSelect.appendChild(opt);
  });
}

// 一键装备功能
function autoEquip() {
  const types = ["weapon", "armor", "mount"];
  let changed = false;

  types.forEach(type => {
    // 找出背包里该类型战力最高的
    const bagItems = gameState.bag
      .map(slot => getItem(slot.itemId))
      .filter(item => item && item.type === type)
      .sort((a, b) => b.power - a.power); // 降序

    if (bagItems.length > 0) {
      const bestItem = bagItems[0];
      const currentId = type === "weapon" ? gameState.hero.weaponId : 
                        type === "armor" ? gameState.hero.armorId : gameState.hero.mountId;
      
      const currentPower = currentId ? getItem(currentId).power : 0;

      if (bestItem.power > currentPower) {
        if (type === "weapon") gameState.hero.weaponId = bestItem.id;
        if (type === "armor") gameState.hero.armorId = bestItem.id;
        if (type === "mount") gameState.hero.mountId = bestItem.id;
        changed = true;
      }
    }
  });

  if (changed) {
    showToast("⚡ 已自动装备背包中最强的装备！");
    refreshAllUI();
  } else {
    showToast("当前已是背包中最强配置。");
  }
}

// 背包与商场
function renderInventory() {
  const inventoryList = document.getElementById("inventory-list");
  const shopList = document.getElementById("shop-list");

  inventoryList.innerHTML = "";
  shopList.innerHTML = "";

  // 背包渲染
  if(gameState.bag.length === 0) {
    inventoryList.innerHTML = "<div class='text-dim text-center'>背包空空如也</div>";
  }

  gameState.bag.forEach((slot) => {
    const item = getItem(slot.itemId);
    if (!item) return;
    const li = document.createElement("li");
    li.className = "item-card";
    const sellPrice = Math.max(item.priceGold * 10 || item.priceSilver || 50);

    li.innerHTML = `
      <div class="item-header">
        <span class="item-name">${item.name}</span>
        <span class="item-tag">x${slot.qty}</span>
      </div>
      <div class="item-meta">
        <span>${item.power > 0 ? `战力 +${item.power}` : "消耗品"}</span>
      </div>
      <div class="item-actions">
         <button class="mini-btn" onclick="sellItem('${item.id}')">出售 (${sellPrice}银)</button>
      </div>
    `;
    inventoryList.appendChild(li);
  });

  // 商场渲染
  gameState.shopStock.forEach((slot) => {
    const item = getItem(slot.itemId);
    if (!item) return;
    const li = document.createElement("li");
    li.className = "item-card";

    let priceText = item.priceGold > 0 ? `<span class="val-gold">${item.priceGold} 金</span>` : `${item.priceSilver || 100} 银`;

    li.innerHTML = `
      <div class="item-header">
        <span class="item-name">${item.name}</span>
        <span class="item-tag shop-stock">余 ${slot.qty === 99 ? "∞" : slot.qty}</span>
      </div>
      <div class="item-meta">
        <span>${item.power > 0 ? `战力 +${item.power}` : "消耗品"}</span>
        <span>${priceText}</span>
      </div>
      <div class="item-actions">
        <button class="mini-btn primary-outline" onclick="buyItem('${item.id}')">购买</button>
      </div>
    `;
    shopList.appendChild(li);
  });
}

// 全局暴露给HTML onclick调用
window.sellItem = function(itemId) {
  const bagSlot = gameState.bag.find((slot) => slot.itemId === itemId);
  if (!bagSlot || bagSlot.qty <= 0) return;

  const item = getItem(itemId);
  const earnSilver = Math.max(item.priceGold * 10 || item.priceSilver || 50);
  
  gameState.player.silver += earnSilver;
  bagSlot.qty -= 1;
  if (bagSlot.qty <= 0) {
    gameState.bag = gameState.bag.filter((slot) => slot.qty > 0);
  }

  showToast(`💰 出售 ${item.name}，获得 ${earnSilver} 银币`);
  refreshAllUI();
}

window.buyItem = function(itemId) {
  const slot = gameState.shopStock.find((s) => s.itemId === itemId);
  if (!slot) return;
  const item = getItem(itemId);
  const p = gameState.player;

  if (item.priceGold > 0) {
    if (p.gold < item.priceGold) {
      showToast("⚠️ 黄金不足");
      return;
    }
    p.gold -= item.priceGold;
  } else {
    const costSilver = item.priceSilver || 100;
    if (p.silver < costSilver) {
      showToast("⚠️ 银币不足");
      return;
    }
    p.silver -= costSilver;
  }

  const bagSlot = gameState.bag.find((s) => s.itemId === itemId);
  if (bagSlot) {
    bagSlot.qty += 1;
  } else {
    gameState.bag.push({ itemId, qty: 1 });
  }

  if (slot.qty !== 99) {
    slot.qty -= 1;
    if (slot.qty <= 0) gameState.shopStock = gameState.shopStock.filter((s) => s.qty > 0);
  }

  showToast(`🎁 购买 ${item.name} 成功！`);
  refreshAllUI();
}

// 副本系统
function updateDungeonUI() {
  const d = gameState.dungeon;
  const world = gameData.worlds[d.currentWorldIndex];
  const stage = world.stages[d.currentStageIndex];

  document.getElementById("world-name").textContent = world.name;
  document.getElementById("stage-name").textContent = stage.name;
  document.getElementById("stage-power").textContent = stage.recommendedPower;
}

function appendLogLine(text, type = "") {
  const logBox = document.getElementById("battle-log");
  const div = document.createElement("div");
  div.className = "log-line";
  if (type) div.classList.add(type);
  div.textContent = text;
  logBox.appendChild(div);
  logBox.scrollTop = logBox.scrollHeight;
}

function simulateBattle() {
  const p = gameState.player;
  const d = gameState.dungeon;
  const world = gameData.worlds[d.currentWorldIndex];
  const stage = world.stages[d.currentStageIndex];
  
  if (p.energy < 10) {
    showToast("⚠️ 精力不足，无法战斗");
    return;
  }

  p.energy = clamp(p.energy - 10, 0, p.maxEnergy);
  updateStatsUI();

  const logBox = document.getElementById("battle-log");
  logBox.innerHTML = "";
  appendLogLine(`⚔️ 遭遇战：${stage.name}`, "system");

  let playerHp = p.hp; // 战斗内临时血量
  let enemyHp = 80 + stage.recommendedPower * 0.6;
  const maxRounds = 10;
  let win = false;

  for (let round = 1; round <= maxRounds; round++) {
    if (playerHp <= 0 || enemyHp <= 0) break;

    // 简单波动伤害公式
    const playerDmg = Math.round((p.power * 0.15) * (0.9 + Math.random() * 0.2));
    const enemyDmg = Math.round((stage.recommendedPower * 0.12) * (0.8 + Math.random() * 0.4));

    enemyHp -= playerDmg;
    appendLogLine(`[第${round}回合] 你造成 ${playerDmg} 伤害`, "player-act");

    if (enemyHp <= 0) {
      win = true;
      break;
    }

    playerHp -= enemyDmg;
    appendLogLine(`[第${round}回合] 敌方反击 ${enemyDmg} 伤害`, "enemy-act");
  }

  // 结算
  p.hp = clamp(Math.round(playerHp > 0 ? playerHp : 1), 1, p.maxHp); // 战斗不死，至少留1点血

  if (win) {
    const earnSilver = 200 + Math.floor(stage.recommendedPower * 0.2);
    p.silver += earnSilver;
    p.level = Math.round((p.level + 0.2) * 10) / 10;
    
    appendLogLine(`🎉 战斗胜利！获得 ${earnSilver} 银币`, "win");
    showToast("战斗胜利！");
    
    // 检查任务
    const event = gameState.events.find((e) => e.id === "dungeonOnce");
    if (event && !event.completed) {
      event.completed = true;
      renderEvents();
      showToast("任务完成：初试锋芒！");
    }
    // 检查战力任务
    const powerEvt = gameState.events.find((e) => e.id === "powerTarget");
    if (powerEvt && !powerEvt.completed && p.power >= 6000) {
      powerEvt.completed = true;
      renderEvents();
      showToast("任务完成：强者之路！");
    }

  } else {
    appendLogLine("💀 战斗失败，你撤退了...", "lose");
    showToast("战斗失败");
  }

  updateStatsUI();
}

// 活动
function renderEvents() {
  const list = document.getElementById("event-list");
  list.innerHTML = "";

  gameState.events.forEach((evt) => {
    const li = document.createElement("li");
    li.className = `event-card ${evt.claimed ? 'claimed' : ''}`;
    
    // 奖励文本生成
    let rewards = [];
    if(evt.reward.silver) rewards.push(`${evt.reward.silver}银`);
    if(evt.reward.gold) rewards.push(`${evt.reward.gold}金`);
    if(evt.reward.energy) rewards.push(`${evt.reward.energy}精力`);

    li.innerHTML = `
      <div class="event-info">
        <div class="event-title">${evt.title}</div>
        <div class="event-desc">${evt.desc}</div>
        <div class="event-reward">🎁 ${rewards.join(" / ")}</div>
      </div>
      <div class="event-action">
        ${evt.claimed 
          ? '<span class="tag-done">已领取</span>' 
          : evt.completed 
            ? `<button class="mini-btn glow" onclick="claimEvent('${evt.id}')">领取</button>` 
            : '<span class="tag-todo">未完成</span>'
        }
      </div>
    `;
    list.appendChild(li);
  });
}

window.claimEvent = function(eventId) {
  const evt = gameState.events.find((e) => e.id === eventId);
  if (!evt || !evt.completed || evt.claimed) return;

  const p = gameState.player;
  if (evt.reward.silver) p.silver += evt.reward.silver;
  if (evt.reward.gold) p.gold += evt.reward.gold;
  if (evt.reward.energy) p.energy = clamp(p.energy + evt.reward.energy, 0, p.maxEnergy);

  evt.claimed = true;
  showToast(`已领取：${evt.title}`);
  refreshAllUI();
}

// 初始化绑定
document.addEventListener("DOMContentLoaded", () => {
  // 导航监听
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.page));
  });

  // 快捷跳转
  document.getElementById("go-dungeon-btn").addEventListener("click", () => setActivePage("dungeon"));
  document.getElementById("go-events-btn").addEventListener("click", () => setActivePage("events"));
  
  // 存档功能
  document.getElementById("save-btn").addEventListener("click", saveGame);
  document.getElementById("load-btn").addEventListener("click", loadGame);

  // 装备逻辑
  const equipHandler = (type, selectId) => {
    const select = document.getElementById(selectId);
    const itemId = select.value;
    if (!itemId) return showToast("请先选择装备");
    
    if(type === 'weapon') gameState.hero.weaponId = itemId;
    if(type === 'armor') gameState.hero.armorId = itemId;
    if(type === 'mount') gameState.hero.mountId = itemId;
    
    showToast("装备成功");
    updateLineupUI();
  };

  document.getElementById("equip-weapon-btn").addEventListener("click", () => equipHandler('weapon', 'weapon-select'));
  document.getElementById("equip-armor-btn").addEventListener("click", () => equipHandler('armor', 'armor-select'));
  document.getElementById("equip-mount-btn").addEventListener("click", () => equipHandler('mount', 'mount-select'));
  
  // 一键装备
  document.getElementById("auto-equip-btn").addEventListener("click", autoEquip);

  // 技能
  document.getElementById("learn-skill-btn").addEventListener("click", () => {
    const id = document.getElementById("skill-select").value;
    if(!id) return showToast("请选择技能");
    
    if(gameState.hero.skills.some(s => s.id === id)) return showToast("已学习该技能");
    if(gameState.hero.skills.length >= 4) return showToast("技能栏已满");
    
    const sk = gameData.skillsPool.find(s => s.id === id);
    gameState.hero.skills.push(sk);
    showToast(`习得技能：${sk.name}`);
    updateLineupUI();
  });

  // 副本控制
  document.getElementById("prev-stage-btn").addEventListener("click", () => {
    const d = gameState.dungeon;
    if (d.currentStageIndex > 0) d.currentStageIndex--;
    else if (d.currentWorldIndex > 0) {
      d.currentWorldIndex--;
      d.currentStageIndex = gameData.worlds[d.currentWorldIndex].stages.length - 1;
    }
    updateDungeonUI();
  });

  document.getElementById("next-stage-btn").addEventListener("click", () => {
    const d = gameState.dungeon;
    const world = gameData.worlds[d.currentWorldIndex];
    if (d.currentStageIndex < world.stages.length - 1) d.currentStageIndex++;
    else if (d.currentWorldIndex < gameData.worlds.length - 1) {
      d.currentWorldIndex++;
      d.currentStageIndex = 0;
    }
    updateDungeonUI();
  });

  document.getElementById("fight-btn").addEventListener("click", simulateBattle);

  // 首次渲染
  refreshAllUI();
});
