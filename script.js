/* 最新版 ① / ④：基本設定・カレンダー */

const STORAGE_EVENTS = "todoEvents";
const STORAGE_TASKS = "todoTasks";
const STORAGE_CATEGORIES = "todoCategories";

const defaultCategories = [
  {id:"work",name:"仕事",color:"#D6B875"},
  {id:"private",name:"プライベート",color:"#D94B87"},
  {id:"beauty",name:"美容",color:"#62B5E5"},
  {id:"other",name:"その他",color:"#A8A8B0"}
];

const categoryColors = [
  "#D6B875","#F4D35E","#B87333","#F2B6C6",
  "#D94B87","#9D174D","#E65C4F","#B91C1C",
  "#E88B3A","#7D3C98","#B89AE5","#2454A6",
  "#62B5E5","#007F86","#147D64","#8DAA45",
  "#F4EEE5","#A8A8B0","#50515A","#080808"
];

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

let events = loadData(STORAGE_EVENTS, {});
let tasks = loadData(STORAGE_TASKS, {});
let categories = loadData(
  STORAGE_CATEGORIES,
  defaultCategories
);

if (!events || typeof events !== "object" ||
    Array.isArray(events)) events = {};

if (!tasks || typeof tasks !== "object" ||
    Array.isArray(tasks)) tasks = {};

if (!Array.isArray(categories) || !categories.length) {
  categories = defaultCategories.map(c => ({...c}));
}

const $ = id => document.getElementById(id);

const today = new Date();

let selectedDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

let displayedMonth = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

let calendarView = "month";
let weekStart = new Date(selectedDate);
let editingEventIndex = null;
let selectedCategoryColor = categoryColors[0];

let multiDateMode = false;
let multiDates = new Set();

const startTimeInput = $("eventTime");
const endTimeInput = $("eventEndTime");
const allDayInput = $("eventAllDay");
const eventForm = $("eventForm");

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")
  ].join("-");
}

function selectedDateKey() {
  return dateKey(selectedDate);
}

function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function categoryOf(id) {
  return categories.find(c => String(c.id) === String(id))
    || {name:"その他",color:"#D6B875"};
}

function uniqueId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2,8);
}

function getDayEvents(key = selectedDateKey()) {
  return Array.isArray(events[key]) ? events[key] : [];
}

function getDayTasks(key = selectedDateKey()) {
  if (!Array.isArray(tasks[key])) tasks[key] = [];
  return tasks[key];
}

function normalizeTodo(item) {
  if (typeof item === "string") {
    return {text:item,completed:false};
  }
  return {
    ...item,
    text:item?.text || item?.title || "",
    completed:Boolean(item?.completed ?? item?.done)
  };
}

function saveEvents() {
  localStorage.setItem(
    STORAGE_EVENTS,
    JSON.stringify(events)
  );
}

function saveTasks() {
  localStorage.setItem(
    STORAGE_TASKS,
    JSON.stringify(tasks)
  );
}

function saveCategories() {
  localStorage.setItem(
    STORAGE_CATEGORIES,
    JSON.stringify(categories)
  );
}

function addEventIfNew(key, event) {
  if (!Array.isArray(events[key])) events[key] = [];

  const exists = events[key].some(existing =>
    String(existing.title || "").trim().toLowerCase() ===
    String(event.title || "").trim().toLowerCase()
  );

  if (exists) return false;

  events[key].push({...event});
  return true;
}

function getWeekStart(date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function renderCalendar() {
  const dates = $("dates");
  const days = $("days");

  dates.innerHTML = "";
  days.innerHTML = "";

  ["日","月","火","水","木","金","土"].forEach(day => {
    days.append(make("div","weekday",day));
  });

  let firstDate;
  let count;

  if (calendarView === "week") {
    firstDate = getWeekStart(weekStart);
    count = 7;
  } else {
    firstDate = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth(),
      1
    );

    count = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth()+1,
      0
    ).getDate();

    for (let i=0;i<firstDate.getDay();i++) {
      dates.append(make("div","empty-date"));
    }
  }

  $("month").textContent = calendarView === "week"
    ? `${firstDate.getFullYear()}年${firstDate.getMonth()+1}月`
    : `${displayedMonth.getFullYear()}年${displayedMonth.getMonth()+1}月`;

  for (let i=0;i<count;i++) {
    const date = calendarView === "week"
      ? new Date(
          firstDate.getFullYear(),
          firstDate.getMonth(),
          firstDate.getDate()+i
        )
      : new Date(
          firstDate.getFullYear(),
          firstDate.getMonth(),
          i+1
        );

    const key = dateKey(date);
    const button = make("button","calendar-date");
    button.type = "button";

    button.append(
      make("span","date-number",String(date.getDate()))
    );

    if (key === dateKey(new Date())) {
      button.classList.add("today");
    }

    if (key === selectedDateKey()) {
      button.classList.add("selected");
    }

    const dayEvents = getDayEvents(key);

    if (dayEvents.length) {
      const dots = make("div","event-dots");

      [...new Set(dayEvents.map(e => e.category))]
        .slice(0,4)
        .forEach(id => {
          const dot = make("span","event-dot");
          dot.style.cssText = `
            display:inline-block;
            width:6px;
            height:6px;
            border-radius:50%;
            margin:0 2px;
            background:${categoryOf(id).color};
          `;
          dots.append(dot);
        });

      button.append(dots);
    }

    if (multiDateMode && multiDates.has(key)) {
      button.style.outline = "2px solid #EADBBC";
      button.style.background =
        "linear-gradient(120deg,#8D7652,#F4E7C9,#A58B62)";
      button.style.color = "#211A12";
    }

    button.addEventListener("click", () => {
      if (multiDateMode) {
        if (multiDates.has(key)) multiDates.delete(key);
        else multiDates.add(key);
        renderCalendar();
        updateMultiInfo();
        return;
      }

      selectedDate = date;
      closeEventForm();
      renderCalendar();
      renderSchedule();
      renderTodos();
    });

    dates.append(button);
  }

  updateViewButtons();
}

function moveCalendar(direction) {
  if (calendarView === "week") {
    weekStart = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate()+direction*7
    );
  } else {
    displayedMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth()+direction,
      1
    );
  }
  renderCalendar();
}

$("prevMonth").addEventListener(
  "click",() => moveCalendar(-1)
);

$("nextMonth").addEventListener(
  "click",() => moveCalendar(1)
);

const viewSwitch = make("div");
viewSwitch.style.cssText =
  "display:flex;justify-content:center;gap:6px;margin-bottom:12px;";

const monthViewButton = make("button","","月");
const weekViewButton = make("button","","週");

monthViewButton.type = "button";
weekViewButton.type = "button";

viewSwitch.append(monthViewButton,weekViewButton);
document.querySelector(".month-header").after(viewSwitch);

function updateViewButtons() {
  [
    [monthViewButton,"month"],
    [weekViewButton,"week"]
  ].forEach(([button,view]) => {
    const active = calendarView === view;
    button.style.background = active ? "#C9B58B" : "#24201B";
    button.style.color = active ? "#211A12" : "#EADBBC";
    button.style.minWidth = "58px";
  });
}

monthViewButton.addEventListener("click",() => {
  calendarView = "month";
  displayedMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  );
  renderCalendar();
});

weekViewButton.addEventListener("click",() => {
  calendarView = "week";
  weekStart = new Date(selectedDate);
  renderCalendar();
});

const swipeCalendar = document.querySelector(".calendar");
let swipeStartX = 0;
let swipeStartY = 0;

swipeCalendar.addEventListener("touchstart",event => {
  if (event.touches.length !== 1) return;
  swipeStartX = event.touches[0].clientX;
  swipeStartY = event.touches[0].clientY;
},{passive:true});

swipeCalendar.addEventListener("touchend",event => {
  if (event.changedTouches.length !== 1) return;

  const dx = event.changedTouches[0].clientX-swipeStartX;
  const dy = event.changedTouches[0].clientY-swipeStartY;

  if (Math.abs(dx)<60 || Math.abs(dx)<Math.abs(dy)*1.3) {
    return;
  }

  moveCalendar(dx<0 ? 1 : -1);
},{passive:true});

/* 最新版 ② / ④：予定登録・繰り返し */

/* 時間の選択肢 */

function setupFiveMinuteTimes() {
  [startTimeInput, endTimeInput].forEach(select => {
    select.innerHTML = "";
    select.add(new Option("時間を選択", ""));

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const time =
          String(hour).padStart(2, "0") + ":" +
          String(minute).padStart(2, "0");

        select.add(new Option(time, time));
      }
    }
  });
}

function setTimeValue(select, value) {
  if (
    value &&
    !Array.from(select.options).some(o => o.value === value)
  ) {
    select.add(new Option(value, value));
  }

  select.value = value || "";
}

function updateTimeInputs() {
  const hidden = allDayInput.checked;

  [startTimeInput, endTimeInput].forEach(select => {
    select.disabled = hidden;
    select.style.display = hidden ? "none" : "";
  });

  ["eventTime", "eventEndTime"].forEach(id => {
    const label = document.querySelector(
      `label[for="${id}"]`
    );

    if (label) {
      label.style.display = hidden ? "none" : "";
    }
  });
}

allDayInput.addEventListener("change", updateTimeInputs);

/* カテゴリー選択 */

function renderCategoryOptions() {
  const select = $("eventCategory");
  const previous = select.value;

  select.innerHTML = "";

  categories.forEach(category => {
    select.add(new Option(category.name, category.id));
  });

  if (categories.some(c => String(c.id) === previous)) {
    select.value = previous;
  }
}

/* 複数日選択 */

const multiButton = make(
  "button",
  "",
  "📅 複数の日付を選択"
);

multiButton.type = "button";
multiButton.style.cssText = `
  display:block;
  width:100%;
  margin-top:18px;
  background:#24201B;
  border:1px solid #C9B58B;
  color:#EADBBC;
`;

const multiInfo = make("div");
multiInfo.style.cssText = `
  margin:10px 0;
  color:#EADBBC;
  font-size:13px;
`;

const saveButton = $("saveEvent");

saveButton.before(multiButton, multiInfo);

function updateMultiInfo() {
  multiInfo.textContent = multiDateMode
    ? `${multiDates.size}日選択中｜日付をタップして追加・解除`
    : "";

  multiButton.textContent = multiDateMode
    ? "✓ 日付選択中（タップで終了）"
    : "📅 複数の日付を選択";
}

multiButton.addEventListener("click", () => {
  multiDateMode = !multiDateMode;

  if (multiDateMode) {
    multiDates = new Set([selectedDateKey()]);
  } else {
    multiDates.clear();
  }

  updateMultiInfo();
  renderCalendar();

  if (multiDateMode) {
    document.querySelector(".calendar")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }
});

/* 繰り返し設定 */

const repeatLabel = make(
  "label",
  "",
  "繰り返し設定"
);

const repeatSelect = make("select");

repeatSelect.innerHTML = `
  <option value="none">繰り返さない</option>
  <option value="weekly">毎週（4週間）</option>
  <option value="monthly">毎月（3か月）</option>
`;

saveButton.before(repeatLabel, repeatSelect);

/* 予定入力フォーム */

function closeEventForm() {
  eventForm.hidden = true;
  editingEventIndex = null;

  $("eventTitle").value = "";
  startTimeInput.value = "";
  endTimeInput.value = "";
  allDayInput.checked = false;
  $("eventMemo").value = "";

  repeatSelect.value = "none";

  multiDateMode = false;
  multiDates.clear();

  updateMultiInfo();
  updateTimeInputs();
}

function openEventForm(index = null) {
  editingEventIndex = index;

  eventForm.hidden = false;
  renderCategoryOptions();

  const dayEvents = getDayEvents();
  const event = index === null ? null : dayEvents[index];

  $("eventTitle").value = event?.title || "";

  setTimeValue(
    startTimeInput,
    event?.time || ""
  );

  setTimeValue(
    endTimeInput,
    event?.endTime || ""
  );

  allDayInput.checked = Boolean(event?.allDay);
  $("eventMemo").value = event?.memo || "";

  if (event?.category) {
    $("eventCategory").value = event.category;
  }

  eventForm.querySelector("h3").textContent =
    event ? "予定を編集" : "新しい予定";

  saveButton.textContent =
    event ? "変更を保存" : "保存する";

  repeatSelect.value = "none";

  multiDateMode = false;
  multiDates.clear();

  updateMultiInfo();
  updateTimeInputs();

  eventForm.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

$("addEvent").addEventListener("click", () => {
  openEventForm();
});

/* 予定を保存 */

saveButton.addEventListener("click", () => {
  const title = $("eventTitle").value.trim();

  if (!title) {
    alert("予定のタイトルを入力してください。");
    return;
  }

  const newEvent = {
    title,
    time: startTimeInput.value,
    endTime: endTimeInput.value,
    allDay: allDayInput.checked,
    category: $("eventCategory").value,
    memo: $("eventMemo").value.trim()
  };

  const key = selectedDateKey();

  if (editingEventIndex !== null) {
    if (!Array.isArray(events[key])) {
      events[key] = [];
    }

    events[key][editingEventIndex] = newEvent;

  } else if (multiDateMode) {

    if (multiDates.size === 0) {
      alert("登録する日付を選択してください。");
      return;
    }

    multiDates.forEach(date => {
      addEventIfNew(date, newEvent);
    });

  } else if (repeatSelect.value !== "none") {

    const start = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    const weekly = repeatSelect.value === "weekly";
    const count = weekly ? 4 : 3;

    for (let i = 0; i < count; i++) {
      let date;

      if (weekly) {
        date = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + i * 7
        );
      } else {
        date = new Date(
          start.getFullYear(),
          start.getMonth() + i,
          1
        );

        const lastDay = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0
        ).getDate();

        date.setDate(
          Math.min(start.getDate(), lastDay)
        );
      }

      addEventIfNew(dateKey(date), newEvent);
    }

  } else {
    addEventIfNew(key, newEvent);
  }

  saveEvents();
  closeEventForm();

  renderCalendar();
  renderSchedule();

  alert("予定を保存しました♡");
});

/* 予定一覧 */

function renderSchedule() {
  $("selectedDateTitle").textContent =
    `${formatDate(selectedDate)}の予定`;

  const list = $("eventList");
  list.innerHTML = "";

  const key = selectedDateKey();
  const dayEvents = getDayEvents(key);

  if (!dayEvents.length) {
    list.append(
      make("p", "empty-message", "予定はまだありません")
    );
    return;
  }

  dayEvents.forEach((event, index) => {
    const category = categoryOf(event.category);

    const card = make("div", "event-card");

    card.style.cssText = `
      border-left:4px solid ${category.color};
      padding:12px;
      background:#202024;
      border-radius:10px;
      margin-bottom:10px;
    `;

    card.append(
      make("strong", "event-title", event.title || "無題の予定")
    );

    let time = "";

    if (event.allDay) {
      time = "終日";
    } else if (event.time && event.endTime) {
      time = `${event.time}〜${event.endTime}`;
    } else {
      time = event.time ||
        (event.endTime ? `〜${event.endTime}` : "");
    }

    if (time) {
      card.append(make("div", "event-time", time));
    }

    const categoryLabel = make(
      "div",
      "event-category",
      category.name
    );

    categoryLabel.style.color = category.color;
    card.append(categoryLabel);

    if (event.memo) {
      card.append(
        make("p", "event-memo", event.memo)
      );
    }

    const actions = make("div", "event-actions");

    actions.style.cssText =
      "display:flex;gap:8px;margin-top:10px;";

    const edit = make("button", "", "編集");
    edit.type = "button";

    edit.addEventListener("click", () => {
      openEventForm(index);
    });

    const remove = make("button", "", "削除");
    remove.type = "button";

    remove.addEventListener("click", () => {
      if (!confirm("この予定を削除しますか？")) {
        return;
      }

      events[key].splice(index, 1);

      saveEvents();
      closeEventForm();
      renderCalendar();
      renderSchedule();
    });

    actions.append(edit, remove);
    card.append(actions);
    list.append(card);
  });
}

/* 最新版 ③ / ④：ToDo・カテゴリー・検索 */

/* =========================
   ToDo管理
========================= */

function renderTodos() {
  const dayTasks = getDayTasks();
  const list = $("todoList");

  list.innerHTML = "";

  $("todoDateTitle").textContent =
    `${formatDate(selectedDate)}のToDo`;

  const completed = dayTasks.filter(
    item => normalizeTodo(item).completed
  ).length;

  $("todoProgress").textContent =
    `${completed} / ${dayTasks.length} 完了`;

  if (!dayTasks.length) {
    list.append(
      make("p", "empty-message", "ToDoはまだありません")
    );
    return;
  }

  dayTasks.forEach((item, index) => {
    const todo = normalizeTodo(item);
    const row = make("div", "todo-item");

    row.style.cssText = `
      display:flex;
      align-items:center;
      gap:8px;
      flex-wrap:wrap;
      padding:10px;
      margin-bottom:8px;
      background:#202024;
      border-radius:10px;
    `;

    const checkbox = make("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;

    checkbox.style.cssText = `
      width:18px;
      height:18px;
      min-height:18px;
      flex:none;
    `;

    checkbox.addEventListener("change", () => {
      dayTasks[index] = {
        ...todo,
        completed:checkbox.checked
      };

      saveTasks();
      renderTodos();
    });

    const label = make("span", "todo-text", todo.text);

    label.style.cssText = `
      flex:1;
      min-width:100px;
      overflow-wrap:anywhere;
    `;

    if (todo.completed) {
      label.style.textDecoration = "line-through";
      label.style.opacity = "0.5";
    }

    const edit = make("button", "", "編集");
    edit.type = "button";

    edit.addEventListener("click", () => {
      const value = prompt(
        "ToDoを編集してください。",
        todo.text
      );

      if (value === null) return;

      const text = value.trim();

      if (!text) {
        alert("ToDoの内容を入力してください。");
        return;
      }

      dayTasks[index] = {...todo, text};

      saveTasks();
      renderTodos();
    });

    const up = make("button", "", "↑");
    up.type = "button";
    up.disabled = index === 0;

    up.addEventListener("click", () => {
      if (index === 0) return;

      [dayTasks[index-1], dayTasks[index]] =
        [dayTasks[index], dayTasks[index-1]];

      saveTasks();
      renderTodos();
    });

    const down = make("button", "", "↓");
    down.type = "button";
    down.disabled = index === dayTasks.length-1;

    down.addEventListener("click", () => {
      if (index >= dayTasks.length-1) return;

      [dayTasks[index], dayTasks[index+1]] =
        [dayTasks[index+1], dayTasks[index]];

      saveTasks();
      renderTodos();
    });

    const remove = make("button", "", "削除");
    remove.type = "button";

    remove.addEventListener("click", () => {
      if (!confirm("このToDoを削除しますか？")) {
        return;
      }

      dayTasks.splice(index, 1);

      saveTasks();
      renderTodos();
    });

    row.append(
      checkbox,
      label,
      edit,
      up,
      down,
      remove
    );

    list.append(row);
  });
}

function addNewTodo() {
  const input = $("todoInput");
  const text = input.value.trim();

  if (!text) {
    alert("ToDoの内容を入力してください。");
    return;
  }

  getDayTasks().push({
    text,
    completed:false
  });

  input.value = "";

  saveTasks();
  renderTodos();
}

$("addTodo").addEventListener("click", addNewTodo);

$("todoInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    addNewTodo();
  }
});

/* =========================
   ToDoの翌日繰り越し
========================= */

const carryButton = make(
  "button",
  "",
  "↗ 未完了のToDoを翌日に移動"
);

carryButton.type = "button";

carryButton.style.cssText = `
  display:block;
  width:100%;
  margin-top:12px;
  background:#24201B;
  border:1px solid #C9B58B;
  color:#EADBBC;
`;

document.querySelector(".todo-section")
  .append(carryButton);

carryButton.addEventListener("click", () => {
  const currentKey = selectedDateKey();
  const currentTasks = getDayTasks(currentKey);

  const unfinished = currentTasks.filter(
    item => !normalizeTodo(item).completed
  );

  if (!unfinished.length) {
    alert("移動する未完了ToDoはありません♡");
    return;
  }

  const tomorrow = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()+1
  );

  const tomorrowKey = dateKey(tomorrow);

  if (!confirm(
    `${unfinished.length}件のToDoを翌日に移動しますか？`
  )) return;

  const nextTasks = getDayTasks(tomorrowKey);

  unfinished.forEach(item => {
    const todo = normalizeTodo(item);

    const exists = nextTasks.some(
      next => normalizeTodo(next).text === todo.text
    );

    if (!exists) {
      nextTasks.push({
        ...todo,
        completed:false
      });
    }
  });

  tasks[currentKey] = currentTasks.filter(
    item => normalizeTodo(item).completed
  );

  saveTasks();
  renderTodos();

  alert("未完了ToDoを翌日に移動しました♡");
});

/* =========================
   カテゴリーのカラー
========================= */

function makeColorPalette(selected, onSelect) {
  const palette = make("div", "color-palette");

  palette.style.cssText = `
    display:grid;
    grid-template-columns:repeat(10,minmax(0,1fr));
    gap:10px 6px;
    justify-items:center;
    width:100%;
  `;

  categoryColors.forEach(color => {
    const button = make("button", "color-option");

    button.type = "button";
    button.title = color;

    button.style.cssText = `
      background:${color};
      width:28px;
      height:28px;
      min-height:28px;
      padding:0;
      border-radius:50%;
      border:1px solid #D6B875;
    `;

    if (
      color.toLowerCase() ===
      String(selected).toLowerCase()
    ) {
      button.style.outline = "2px solid #F0DBA7";
      button.style.outlineOffset = "2px";
    }

    button.addEventListener("click", () => {
      onSelect(color);
    });

    palette.append(button);
  });

  return palette;
}

function renderNewCategoryPalette() {
  const container = $("newCategoryColors");
  container.innerHTML = "";

  container.append(
    makeColorPalette(
      selectedCategoryColor,
      color => {
        selectedCategoryColor = color;
        $("newCategoryColor").value = color;
        renderNewCategoryPalette();
      }
    )
  );

  $("newCategoryColor").value = selectedCategoryColor;
}

/* =========================
   カテゴリー管理
========================= */

function renderCategoryManager() {
  const list = $("categoryList");
  list.innerHTML = "";

  categories.forEach(category => {
    const row = make("div", "category-item");

    row.style.cssText = `
      display:flex;
      align-items:center;
      gap:8px;
      flex-wrap:wrap;
      padding:10px;
      margin-bottom:10px;
      background:#202024;
      border-radius:10px;
    `;

    const colorMark = make("span", "category-color");

    colorMark.style.cssText = `
      background:${category.color};
      width:20px;
      height:20px;
      border-radius:50%;
      border:1px solid #D6B875;
      flex:none;
    `;

    const name = make(
      "span",
      "category-name",
      category.name
    );

    name.style.cssText = `
      flex:1;
      min-width:80px;
      overflow-wrap:anywhere;
    `;

    const colorButton = make("button", "", "色変更");
    const editButton = make("button", "", "編集");
    const deleteButton = make("button", "", "削除");

    const paletteArea = make(
      "div",
      "category-palette-area"
    );

    paletteArea.style.cssText = `
      display:none;
      width:100%;
      margin-top:8px;
    `;

    colorButton.addEventListener("click", () => {
      const isOpen =
        paletteArea.style.display !== "none";

      paletteArea.style.display =
        isOpen ? "none" : "block";

      paletteArea.innerHTML = "";

      if (!isOpen) {
        paletteArea.append(
          makeColorPalette(
            category.color,
            newColor => {
              category.color = newColor;

              saveCategories();
              renderCategoryManager();
              renderCategoryOptions();
              renderCalendar();
              renderSchedule();
            }
          )
        );
      }
    });

    editButton.addEventListener("click", () => {
      const value = prompt(
        "カテゴリー名を編集してください。",
        category.name
      );

      if (value === null) return;

      const newName = value.trim();

      if (!newName) {
        alert("カテゴリー名を入力してください。");
        return;
      }

      category.name = newName;

      saveCategories();
      renderCategoryManager();
      renderCategoryOptions();
      renderSchedule();
    });

    deleteButton.addEventListener("click", () => {
      if (categories.length <= 1) {
        alert("カテゴリーは最低1つ必要です。");
        return;
      }

      if (!confirm(
        `「${category.name}」を削除しますか？`
      )) return;

      categories = categories.filter(
        item => item.id !== category.id
      );

      saveCategories();
      renderCategoryManager();
      renderCategoryOptions();
      renderCalendar();
      renderSchedule();
    });

    row.append(
      colorMark,
      name,
      colorButton,
      editButton,
      deleteButton,
      paletteArea
    );

    list.append(row);
  });
}

$("toggleCategories").addEventListener("click", () => {
  const manager = $("categoryManager");
  manager.hidden = !manager.hidden;
});

$("createCategory").addEventListener("click", () => {
  const input = $("newCategoryName");
  const name = input.value.trim();

  if (!name) {
    alert("カテゴリー名を入力してください。");
    return;
  }

  categories.push({
    id:uniqueId(),
    name,
    color:selectedCategoryColor
  });

  input.value = "";

  saveCategories();
  renderCategoryOptions();
  renderCategoryManager();
  renderNewCategoryPalette();
});

/* =========================
   予定検索
========================= */

const searchSection = make("section", "schedule");

searchSection.innerHTML = `
  <h3>🔎 予定を検索</h3>
  <input
    id="eventSearchInput"
    type="search"
    placeholder="予定の名前やメモを入力"
  >
  <div id="eventSearchResults"></div>
`;

document.querySelector(".calendar")
  .after(searchSection);

const searchInput = $("eventSearchInput");
const searchResults = $("eventSearchResults");

function renderSearchResults() {
  const keyword = searchInput.value
    .trim()
    .toLowerCase();

  searchResults.innerHTML = "";

  if (!keyword) return;

  const matches = [];

  Object.keys(events).sort().forEach(key => {
    if (!Array.isArray(events[key])) return;

    events[key].forEach(event => {
      const title = String(event.title || "");
      const memo = String(event.memo || "");

      if (
        title.toLowerCase().includes(keyword) ||
        memo.toLowerCase().includes(keyword)
      ) {
        matches.push({key,event});
      }
    });
  });

  if (!matches.length) {
    searchResults.textContent =
      "該当する予定はありません";
    return;
  }

  matches.forEach(({key,event}) => {
    const button = make("button");

    button.type = "button";

    button.style.cssText = `
      display:block;
      width:100%;
      text-align:left;
      margin-top:10px;
      padding:14px;
      background:#211f20;
      border:1px solid #6b593f;
      border-radius:12px;
      color:#eadbbc;
    `;

    const dateText = key.replace(
      /^(\d{4})-(\d{2})-(\d{2})$/,
      "$1年$2月$3日"
    );

    const dateLine = make(
      "div",
      "",
      dateText
    );

    dateLine.style.fontSize = "12px";

    const titleLine = make(
      "strong",
      "",
      event.title || "無題の予定"
    );

    button.append(dateLine,titleLine);

    button.addEventListener("click", () => {
      const [year,month,day] =
        key.split("-").map(Number);

      selectedDate = new Date(
        year,
        month-1,
        day
      );

      displayedMonth = new Date(
        year,
        month-1,
        1
      );

      weekStart = new Date(selectedDate);

      multiDateMode = false;
      multiDates.clear();
      updateMultiInfo();

      closeEventForm();
      renderCalendar();
      renderSchedule();
      renderTodos();

      $("selectedDateTitle").scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });

    searchResults.append(button);
  });
}

searchInput.addEventListener(
  "input",
  renderSearchResults
);

/* 最新版 ④ / ④：秘密ボタン・バックアップ・復元 */

/* =========================
   ✦ 今日の予定を秘密表示
========================= */

const todaySummary = make("section", "schedule");

const summaryButton = make("button", "", "✦");
summaryButton.type = "button";

summaryButton.style.cssText = `
  display:block;
  width:100%;
  text-align:center;
  font-size:22px;
  letter-spacing:4px;
  background:#24201B;
  border:1px solid #C9B58B;
  color:#EADBBC;
`;

const summaryContent = make("div");
summaryContent.hidden = true;

summaryContent.style.cssText = `
  margin-top:14px;
  padding:12px;
  border-radius:12px;
  background:#202024;
  color:#EADBBC;
`;

todaySummary.append(summaryButton, summaryContent);

document.querySelector(".calendar")
  .before(todaySummary);

function renderTodaySummary() {
  summaryContent.innerHTML = "";

  const key = dateKey(new Date());
  const dayEvents = getDayEvents(key);

  const todayTasks = Array.isArray(tasks[key])
    ? tasks[key]
    : [];

  const eventHeading = make(
    "h3",
    "",
    "今日の予定"
  );

  summaryContent.append(eventHeading);

  if (!dayEvents.length) {
    summaryContent.append(
      make("p", "", "予定はありません")
    );
  } else {
    dayEvents.forEach(event => {
      const category = categoryOf(event.category);

      const row = make("div");

      row.style.cssText = `
        padding:10px;
        margin-bottom:8px;
        border-left:3px solid ${category.color};
        background:#29272A;
        border-radius:8px;
      `;

      const title = make(
        "strong",
        "",
        event.title || "無題の予定"
      );

      row.append(title);

      const time = event.allDay
        ? "終日"
        : [
            event.time || "",
            event.endTime || ""
          ].filter(Boolean).join("〜");

      if (time) {
        const timeText = make("div", "", time);
        timeText.style.fontSize = "12px";
        row.append(timeText);
      }

      summaryContent.append(row);
    });
  }

  const todoHeading = make(
    "h3",
    "",
    "今日のToDo"
  );

  todoHeading.style.marginTop = "18px";
  summaryContent.append(todoHeading);

  if (!todayTasks.length) {
    summaryContent.append(
      make("p", "", "ToDoはありません")
    );
  } else {
    todayTasks.forEach(item => {
      const todo = normalizeTodo(item);

      const row = make(
        "div",
        "",
        `${todo.completed ? "✓" : "○"} ${todo.text}`
      );

      row.style.cssText = `
        padding:7px 0;
        border-bottom:1px solid #49413A;
        overflow-wrap:anywhere;
      `;

      if (todo.completed) {
        row.style.opacity = "0.5";
        row.style.textDecoration = "line-through";
      }

      summaryContent.append(row);
    });
  }
}

summaryButton.addEventListener("click", () => {
  summaryContent.hidden = !summaryContent.hidden;

  // ボタン名は開閉しても「✦」のまま
  summaryButton.textContent = "✦";

  if (!summaryContent.hidden) {
    renderTodaySummary();
  }
});

/* =========================
   データ管理
========================= */

const backupSection = make("section", "category-section");

const backupHeading = make("button", "", "⚙ データ管理");
backupHeading.type = "button";

backupHeading.style.cssText = `
  display:block;
  width:100%;
  background:#24201B;
  border:1px solid #C9B58B;
  color:#EADBBC;
`;

const backupPanel = make("div");
backupPanel.hidden = true;
backupPanel.style.marginTop = "14px";

const backupDescription = make(
  "p",
  "",
  "予定・ToDo・カテゴリーをまとめて保存できます。"
);

backupDescription.style.cssText = `
  font-size:13px;
  color:#A6A19A;
`;

const exportButton = make(
  "button",
  "",
  "↓ バックアップを保存"
);

exportButton.type = "button";

const importButton = make(
  "button",
  "",
  "↑ バックアップから復元"
);

importButton.type = "button";

[exportButton, importButton].forEach(button => {
  button.style.cssText = `
    display:block;
    width:100%;
    margin-top:10px;
    background:#24201B;
    border:1px solid #C9B58B;
    color:#EADBBC;
  `;
});

const backupFileInput = make("input");
backupFileInput.type = "file";
backupFileInput.accept = ".json,application/json";
backupFileInput.hidden = true;

backupPanel.append(
  backupDescription,
  exportButton,
  importButton,
  backupFileInput
);

backupSection.append(
  backupHeading,
  backupPanel
);

document.querySelector(".category-section")
  .after(backupSection);

backupHeading.addEventListener("click", () => {
  backupPanel.hidden = !backupPanel.hidden;
});

/* =========================
   バックアップを保存
========================= */

exportButton.addEventListener("click", () => {
  try {
    const backupData = {
      version:1,
      exportedAt:new Date().toISOString(),
      events:events,
      tasks:tasks,
      categories:categories
    };

    const json = JSON.stringify(
      backupData,
      null,
      2
    );

    const blob = new Blob(
      [json],
      {type:"application/json"}
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      `Todo_Backup_${dateKey(new Date())}.json`;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);

  } catch (error) {
    console.error(error);
    alert("バックアップの作成に失敗しました。");
  }
});

/* =========================
   バックアップから復元
========================= */

importButton.addEventListener("click", () => {
  backupFileInput.click();
});

function isValidBackup(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (data.version !== 1) {
    return false;
  }

  if (
    !data.events ||
    typeof data.events !== "object" ||
    Array.isArray(data.events)
  ) {
    return false;
  }

  if (
    !data.tasks ||
    typeof data.tasks !== "object" ||
    Array.isArray(data.tasks)
  ) {
    return false;
  }

  if (
    !Array.isArray(data.categories) ||
    data.categories.length === 0
  ) {
    return false;
  }

  const validCategories = data.categories.every(
    category =>
      category &&
      typeof category.id === "string" &&
      typeof category.name === "string" &&
      typeof category.color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(category.color)
  );

  if (!validCategories) return false;

  const validEvents = Object.entries(data.events).every(
    ([key,items]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(key) &&
      Array.isArray(items) &&
      items.every(
        event =>
          event &&
          typeof event === "object" &&
          typeof event.title === "string"
      )
  );

  if (!validEvents) return false;

  const validTasks = Object.entries(data.tasks).every(
    ([key,items]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(key) &&
      Array.isArray(items) &&
      items.every(
        item =>
          typeof item === "string" ||
          (
            item &&
            typeof item === "object" &&
            (
              typeof item.text === "string" ||
              typeof item.title === "string"
            )
          )
      )
  );

  return validTasks;
}

backupFileInput.addEventListener(
  "change",
  async () => {
    const file = backupFileInput.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!isValidBackup(data)) {
        alert(
          "正しいバックアップファイルではありません。"
        );
        return;
      }

      const confirmed = confirm(
        "現在の予定・ToDo・カテゴリーを上書きします。\n" +
        "復元する前に、今のデータをバックアップしましたか？"
      );

      if (!confirmed) return;

      // 保存に失敗した場合に備えて現在の値を保持
      const oldEvents = events;
      const oldTasks = tasks;
      const oldCategories = categories;

      const oldStoredEvents =
        localStorage.getItem(STORAGE_EVENTS);

      const oldStoredTasks =
        localStorage.getItem(STORAGE_TASKS);

      const oldStoredCategories =
        localStorage.getItem(STORAGE_CATEGORIES);

      try {
        // 先に保存できるか確認
        localStorage.setItem(
          STORAGE_EVENTS,
          JSON.stringify(data.events)
        );

        localStorage.setItem(
          STORAGE_TASKS,
          JSON.stringify(data.tasks)
        );

        localStorage.setItem(
          STORAGE_CATEGORIES,
          JSON.stringify(data.categories)
        );

        events = data.events;
        tasks = data.tasks;
        categories = data.categories;

      } catch (saveError) {
        events = oldEvents;
        tasks = oldTasks;
        categories = oldCategories;

        [
          [STORAGE_EVENTS, oldStoredEvents],
          [STORAGE_TASKS, oldStoredTasks],
          [STORAGE_CATEGORIES, oldStoredCategories]
        ].forEach(([key,value]) => {
          try {
            if (value === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key,value);
            }
          } catch (error) {
            console.error(error);
          }
        });

        throw saveError;
      }

      multiDateMode = false;
      multiDates.clear();

      calendarView = "month";

      displayedMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );

      closeEventForm();
      renderCategoryOptions();
      renderCategoryManager();
      renderNewCategoryPalette();

      renderCalendar();
      renderSchedule();
      renderTodos();
      renderSearchResults();

      summaryContent.hidden = true;
      summaryButton.textContent = "✦";

      alert("バックアップを復元しました♡");

    } catch (error) {
      console.error(error);

      alert(
        "復元できませんでした。\n" +
        "ファイルの内容を確認してください。"
      );

    } finally {
      backupFileInput.value = "";
    }
  }
);

/* =========================
   初期表示
========================= */

setupFiveMinuteTimes();
updateTimeInputs();

renderCategoryOptions();
renderNewCategoryPalette();
renderCategoryManager();

updateMultiInfo();

renderCalendar();
renderSchedule();
renderTodos();

/* =========================
   STEP 35：シークレットモード
========================= */

// 秘密モードの状態
let secretMode35 = false;

// シークレットモードのボタン
const secretButton35 = document.createElement("button");

secretButton35.type = "button";
secretButton35.textContent = "◉";
secretButton35.title = "シークレットモード";

secretButton35.style.cssText = `
  position:fixed;
  top:16px;
  right:16px;
  z-index:99999;
  width:48px;
  height:48px;
  padding:0;
  border-radius:50%;
  background:#24201B;
  color:#EADBBC;
  border:1px solid #C9B58B;
  font-size:23px;
  cursor:pointer;
  box-shadow:0 4px 18px rgba(0,0,0,.35);
`;

// 秘密モード中に表示する画面
const secretScreen35 = document.createElement("div");

secretScreen35.style.cssText = `
  position:fixed;
  inset:0;
  z-index:99998;
  display:none;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  gap:12px;
  background:#0B0B0D;
  color:#EADBBC;
  text-align:center;
`;

const secretIcon35 = document.createElement("div");
secretIcon35.textContent = "✦";
secretIcon35.style.fontSize = "42px";

const secretTitle35 = document.createElement("div");
secretTitle35.textContent = "SECRET MODE";
secretTitle35.style.cssText = `
  font-size:17px;
  letter-spacing:4px;
`;

const secretText35 = document.createElement("div");
secretText35.textContent = "画面を非表示にしています";
secretText35.style.cssText = `
  color:#A6A19A;
  font-size:12px;
`;

secretScreen35.append(
  secretIcon35,
  secretTitle35,
  secretText35
);

document.body.append(
  secretScreen35,
  secretButton35
);

// 表示・非表示の切り替え
function toggleSecretMode35() {
  secretMode35 = !secretMode35;

  if (secretMode35) {
    secretScreen35.style.display = "flex";
    secretButton35.textContent = "◎";

    // 今日の予定も閉じる
    if (typeof summaryContent !== "undefined") {
      summaryContent.hidden = true;
    }

  } else {
    secretScreen35.style.display = "none";
    secretButton35.textContent = "◉";
  }
}

/* =========================
   STEP 36：予定テンプレート機能
========================= */

const TEMPLATE_KEY36 = "todoEventTemplates36";

let templates36 = [];

try {
  const saved36 = JSON.parse(
    localStorage.getItem(TEMPLATE_KEY36) || "[]"
  );

  templates36 = Array.isArray(saved36) ? saved36 : [];
} catch (error) {
  templates36 = [];
}

function saveTemplates36() {
  localStorage.setItem(
    TEMPLATE_KEY36,
    JSON.stringify(templates36)
  );
}

// テンプレート用の表示エリア
const templateArea36 = document.createElement("div");

templateArea36.style.cssText = `
  margin:14px 0;
  padding:14px;
  background:#1C1B1D;
  border:1px solid #66563D;
  border-radius:12px;
`;

const templateHeading36 = document.createElement("div");

templateHeading36.textContent = "✦ 予定テンプレート";

templateHeading36.style.cssText = `
  color:#EADBBC;
  font-size:14px;
  margin-bottom:10px;
  letter-spacing:1px;
`;

const templateSelect36 = document.createElement("select");

templateSelect36.style.cssText = `
  width:100%;
  margin-bottom:10px;
`;

const templateActions36 = document.createElement("div");

templateActions36.style.cssText = `
  display:flex;
  flex-wrap:wrap;
  gap:8px;
`;

const templateSave36 = document.createElement("button");
templateSave36.type = "button";
templateSave36.textContent = "＋ 今の入力を登録";

const templateApply36 = document.createElement("button");
templateApply36.type = "button";
templateApply36.textContent = "適用する";

const templateDelete36 = document.createElement("button");
templateDelete36.type = "button";
templateDelete36.textContent = "削除";

[templateSave36,templateApply36,templateDelete36]
  .forEach(button => {
    button.style.cssText = `
      flex:1;
      min-width:95px;
      padding:10px 6px;
      background:#24201B;
      border:1px solid #C9B58B;
      border-radius:8px;
      color:#EADBBC;
      font-size:12px;
    `;
  });

templateActions36.append(
  templateSave36,
  templateApply36,
  templateDelete36
);

templateArea36.append(
  templateHeading36,
  templateSelect36,
  templateActions36
);

// 予定フォーム内に追加
saveButton.before(templateArea36);

// テンプレート一覧を更新
function renderTemplates36() {
  const previous = templateSelect36.value;

  templateSelect36.innerHTML = "";

  const placeholder = new Option(
    "テンプレートを選択",
    ""
  );

  templateSelect36.add(placeholder);

  templates36.forEach(template => {
    templateSelect36.add(
      new Option(template.name, template.id)
    );
  });

  if (templates36.some(t => t.id === previous)) {
    templateSelect36.value = previous;
  }
}

// 入力中の予定をテンプレートとして保存
templateSave36.addEventListener("click", () => {
  const title = $("eventTitle").value.trim();

  if (!title) {
    alert("先に予定のタイトルを入力してね♡");
    return;
  }

  const name = prompt(
    "テンプレートの名前を入力してね♡",
    title
  );

  if (name === null) return;

  const trimmedName = name.trim();

  if (!trimmedName) {
    alert("テンプレート名を入力してね♡");
    return;
  }

  const template = {
    id:uniqueId(),
    name:trimmedName,
    title:title,
    time:startTimeInput.value,
    endTime:endTimeInput.value,
    allDay:allDayInput.checked,
    category:$("eventCategory").value,
    memo:$("eventMemo").value
  };

  templates36.push(template);

  try {
    saveTemplates36();
    renderTemplates36();
    templateSelect36.value = template.id;

    alert("テンプレートを登録しました♡");
  } catch (error) {
    templates36.pop();
    alert("保存できませんでした。");
  }
});

// テンプレートをフォームに適用
templateApply36.addEventListener("click", () => {
  const template = templates36.find(
    t => t.id === templateSelect36.value
  );

  if (!template) {
    alert("テンプレートを選んでね♡");
    return;
  }

  $("eventTitle").value = template.title;

  setTimeValue(
    startTimeInput,
    template.time
  );

  setTimeValue(
    endTimeInput,
    template.endTime
  );

  allDayInput.checked = Boolean(template.allDay);

  const categoryExists = categories.some(
    c => String(c.id) === String(template.category)
  );

  if (categoryExists) {
    $("eventCategory").value = template.category;
  }

  $("eventMemo").value = template.memo || "";

  updateTimeInputs();

  alert("テンプレートを入力しました♡");
});

// テンプレートを削除
templateDelete36.addEventListener("click", () => {
  const template = templates36.find(
    t => t.id === templateSelect36.value
  );

  if (!template) {
    alert("削除するテンプレートを選んでね♡");
    return;
  }

  if (!confirm(
    `「${template.name}」を削除しますか？`
  )) return;

  const previousTemplates = templates36;

  templates36 = templates36.filter(
    t => t.id !== template.id
  );

  try {
    saveTemplates36();
    renderTemplates36();

    alert("テンプレートを削除しました♡");
  } catch (error) {
    templates36 = previousTemplates;
    alert("削除を保存できませんでした。");
  }
});

// 初期表示
renderTemplates36();


/* 通知メッセージをシンプルに統一 */

const originalAlert36 = window.alert;

window.alert = function(message) {
  let text = String(message)
    .replace(/[♡♥💕💖🥰😍✨🎉🖤]/gu, "")
    .trim();

  if (text && !/[。！？.!?]$/.test(text)) {
    text += "。";
  }

  originalAlert36.call(window, text);
};

/* =========================
   STEP 37：ToDoの繰り返し機能
========================= */

// 繰り返し設定を追加
const todoRepeat37 = document.createElement("select");

todoRepeat37.id = "todoRepeat37";

todoRepeat37.innerHTML = `
  <option value="none">繰り返さない</option>
  <option value="daily">毎日（30日間）</option>
  <option value="weekly">毎週（4週間）</option>
  <option value="monthly">毎月（3か月間）</option>
`;

todoRepeat37.style.cssText = `
  display:block;
  width:100%;
  margin:12px 0;
  padding:12px;
  background:#242124;
  color:#EADBBC;
  border:1px solid #66563D;
  border-radius:10px;
`;

// ToDo入力欄の下に設置
const todoAdd37 = document.querySelector(".todo-add");

todoAdd37.after(todoRepeat37);

// 繰り返し日付を作る
function getRepeatDates37(start, repeat) {
  const dates = [];

  const count = repeat === "daily" ? 30 :
                repeat === "weekly" ? 4 :
                repeat === "monthly" ? 3 : 1;

  for (let i = 0; i < count; i++) {
    let date;

    if (repeat === "daily") {
      date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i
      );

    } else if (repeat === "weekly") {
      date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i * 7
      );

    } else if (repeat === "monthly") {
      date = new Date(
        start.getFullYear(),
        start.getMonth() + i,
        1
      );

      const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate();

      date.setDate(
        Math.min(start.getDate(), lastDay)
      );

    } else {
      date = new Date(start);
    }

    dates.push(dateKey(date));
  }

  return dates;
}

// 元のToDo追加処理を差し替える
const originalAddNewTodo37 = addNewTodo;

addNewTodo = function() {
  const input = $("todoInput");
  const text = input.value.trim();

  if (!text) {
    alert("ToDoの内容を入力してください。");
    return;
  }

  const repeat = todoRepeat37.value;

  // 通常追加はこれまでの機能を使用
  if (repeat === "none") {
    originalAddNewTodo37();
    return;
  }

  const dates = getRepeatDates37(
    selectedDate,
    repeat
  );

  let added = 0;

  dates.forEach(key => {
    const dayTasks = getDayTasks(key);

    const exists = dayTasks.some(
      item =>
        normalizeTodo(item).text.trim()
          .toLowerCase() === text.toLowerCase()
    );

    if (!exists) {
      dayTasks.push({
        text:text,
        completed:false
      });

      added++;
    }
  });

  saveTasks();

  input.value = "";
  todoRepeat37.value = "none";

  renderTodos();

  alert(`${added}件のToDoを登録しました。`);
};

// 既存の追加ボタンとEnterキーに
// 繰り返し機能を適用する
const addTodoButton37 = $("addTodo");
const todoInput37 = $("todoInput");

// 古いイベント処理と重ならないように
// ボタンを複製して置き換える
const newAddButton37 = addTodoButton37.cloneNode(true);

addTodoButton37.replaceWith(newAddButton37);

newAddButton37.addEventListener(
  "click",
  addNewTodo
);

// Enterキーも新しい処理に変更
const newTodoInput37 = todoInput37.cloneNode(true);

todoInput37.replaceWith(newTodoInput37);

newTodoInput37.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addNewTodo();
    }
  }
);

/* =========================
   STEP 38：週間タイムライン
========================= */

// タイムライン全体
const timelineSection38 =
  document.createElement("section");

timelineSection38.className = "schedule";

// 開閉ボタン
const timelineToggle38 =
  document.createElement("button");

timelineToggle38.type = "button";
timelineToggle38.textContent =
  "✦ 週間タイムライン";

timelineToggle38.style.cssText = `
  display:block;
  width:100%;
  background:#24201B;
  border:1px solid #C9B58B;
  color:#EADBBC;
  letter-spacing:1px;
`;

// 非表示からスタート
const timelineContent38 =
  document.createElement("div");

timelineContent38.hidden = true;

timelineContent38.style.cssText = `
  margin-top:14px;
`;

// 週の移動ボタン
const timelineNav38 =
  document.createElement("div");

timelineNav38.style.cssText = `
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:16px;
`;

const timelinePrev38 =
  document.createElement("button");

timelinePrev38.type = "button";
timelinePrev38.textContent = "〈";

const timelineNext38 =
  document.createElement("button");

timelineNext38.type = "button";
timelineNext38.textContent = "〉";

const timelineTitle38 =
  document.createElement("div");

timelineTitle38.style.cssText = `
  color:#EADBBC;
  font-size:13px;
  text-align:center;
  flex:1;
`;

timelineNav38.append(
  timelinePrev38,
  timelineTitle38,
  timelineNext38
);

// 予定の表示エリア
const timelineList38 =
  document.createElement("div");

timelineContent38.append(
  timelineNav38,
  timelineList38
);

timelineSection38.append(
  timelineToggle38,
  timelineContent38
);

// カレンダーの下に配置
document.querySelector(".calendar")
  .after(timelineSection38);

// 表示する週
let timelineWeek38 = getWeekStart(selectedDate);

// 曜日
const timelineDays38 = [
  "SUN","MON","TUE","WED",
  "THU","FRI","SAT"
];

// 時刻の並び替え
function sortTimelineEvents38(items) {
  return [...items].sort((a,b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;

    return String(a.time || "99:99")
      .localeCompare(String(b.time || "99:99"));
  });
}

// 1週間を描画
function renderTimeline38() {
  timelineList38.innerHTML = "";

  const start = getWeekStart(timelineWeek38);

  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()+6
  );

  timelineTitle38.textContent =
    `${start.getMonth()+1}/${start.getDate()}` +
    " 〜 " +
    `${end.getMonth()+1}/${end.getDate()}`;

  for (let i=0;i<7;i++) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()+i
    );

    const key = dateKey(date);
    const dayEvents = sortTimelineEvents38(
      getDayEvents(key)
    );

    // 日付ごとの行
    const dayRow = document.createElement("div");

    dayRow.style.cssText = `
      display:flex;
      gap:12px;
      padding:13px 0;
      border-bottom:1px solid #40372F;
    `;

    const dateColumn =
      document.createElement("div");

    dateColumn.style.cssText = `
      width:54px;
      min-width:54px;
      color:#C9B58B;
      font-size:12px;
    `;

    const weekday =
      document.createElement("div");

    weekday.textContent = timelineDays38[
      date.getDay()
    ];

    weekday.style.fontWeight = "bold";

    const dayNumber =
      document.createElement("div");

    dayNumber.textContent =
      `${date.getMonth()+1}/${date.getDate()}`;

    dayNumber.style.cssText = `
      color:#A6A19A;
      margin-top:4px;
    `;

    dateColumn.append(
      weekday,
      dayNumber
    );

    const eventColumn =
      document.createElement("div");

    eventColumn.style.cssText = `
      flex:1;
      min-width:0;
    `;

    if (!dayEvents.length) {
      const empty = document.createElement("div");

      empty.textContent = "予定なし";

      empty.style.cssText = `
        padding:10px;
        color:#88838A;
        font-size:12px;
        background:#222024;
        border-radius:8px;
      `;

      eventColumn.append(empty);

    } else {
      dayEvents.forEach(event => {
        const category = categoryOf(
          event.category
        );

        const card =
          document.createElement("div");

        card.style.cssText = `
          padding:10px 12px;
          margin-bottom:8px;
          border-left:3px solid ${category.color};
          background:#252326;
          border-radius:8px;
          overflow-wrap:anywhere;
        `;

        const time =
          document.createElement("div");

        if (event.allDay) {
          time.textContent = "終日";
        } else if (event.time && event.endTime) {
          time.textContent =
            `${event.time} 〜 ${event.endTime}`;
        } else {
          time.textContent =
            event.time || "時間未設定";
        }

        time.style.cssText = `
          color:#A6A19A;
          font-size:11px;
          margin-bottom:5px;
        `;

        const title =
          document.createElement("div");

        title.textContent =
          event.title || "無題の予定";

        title.style.cssText = `
          color:#EADBBC;
          font-size:13px;
          font-weight:500;
        `;

        card.append(time,title);
        eventColumn.append(card);
      });
    }

    dayRow.append(
      dateColumn,
      eventColumn
    );

    timelineList38.append(dayRow);
  }
}

// 開閉
timelineToggle38.addEventListener(
  "click",
  () => {
    timelineContent38.hidden =
      !timelineContent38.hidden;

    if (!timelineContent38.hidden) {
      timelineWeek38 = getWeekStart(
        selectedDate
      );

      renderTimeline38();
    }
  }
);

// 前の週
timelinePrev38.addEventListener(
  "click",
  () => {
    timelineWeek38.setDate(
      timelineWeek38.getDate()-7
    );

    renderTimeline38();
  }
);

// 次の週
timelineNext38.addEventListener(
  "click",
  () => {
    timelineWeek38.setDate(
      timelineWeek38.getDate()+7
    );

    renderTimeline38();
  }
);

// 予定保存・削除後にも表示を更新
const originalRenderSchedule38 =
  renderSchedule;

renderSchedule = function() {
  originalRenderSchedule38();

  if (!timelineContent38.hidden) {
    renderTimeline38();
  }
};

// シークレットモードに入る際は閉じる
if (typeof secretButton35 !== "undefined") {
  secretButton35.addEventListener(
    "click",
    () => {
      if (secretMode35) {
        timelineContent38.hidden = true;
      }
    }
  );
}

/* =========================
   STEP 39：月間レポート
========================= */

const reportSection39 = document.createElement("section");
reportSection39.className = "schedule";

const reportToggle39 = document.createElement("button");
reportToggle39.type = "button";
reportToggle39.textContent = "✦ 月間レポート";
reportToggle39.style.cssText = `
  display:block;
  width:100%;
  background:#24201B;
  color:#EADBBC;
  border:1px solid #C9B58B;
`;

const reportContent39 = document.createElement("div");
reportContent39.hidden = true;
reportContent39.style.marginTop = "16px";

const reportNav39 = document.createElement("div");
reportNav39.style.cssText = `
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:18px;
`;

const reportPrev39 = document.createElement("button");
reportPrev39.type = "button";
reportPrev39.textContent = "〈";

const reportNext39 = document.createElement("button");
reportNext39.type = "button";
reportNext39.textContent = "〉";

const reportMonthLabel39 = document.createElement("strong");
reportMonthLabel39.style.color = "#EADBBC";

reportNav39.append(
  reportPrev39,
  reportMonthLabel39,
  reportNext39
);

const reportBody39 = document.createElement("div");

reportContent39.append(reportNav39, reportBody39);
reportSection39.append(reportToggle39, reportContent39);

// 週間タイムラインの下に設置
timelineSection38.after(reportSection39);

let reportMonth39 = new Date(
  selectedDate.getFullYear(),
  selectedDate.getMonth(),
  1
);

function renderReport39() {
  reportBody39.innerHTML = "";

  const year = reportMonth39.getFullYear();
  const month = reportMonth39.getMonth();

  reportMonthLabel39.textContent =
    `${year}年${month + 1}月`;

  let eventCount = 0;
  let todoCount = 0;
  let completedCount = 0;

  const categoryCounts = {};

  Object.entries(events).forEach(([key,items]) => {
    if (!key.startsWith(
      `${year}-${String(month + 1).padStart(2,"0")}-`
    )) return;

    if (!Array.isArray(items)) return;

    items.forEach(event => {
      eventCount++;

      const id = String(event.category || "other");
      categoryCounts[id] = (categoryCounts[id] || 0) + 1;
    });
  });

  Object.entries(tasks).forEach(([key,items]) => {
    if (!key.startsWith(
      `${year}-${String(month + 1).padStart(2,"0")}-`
    )) return;

    if (!Array.isArray(items)) return;

    items.forEach(item => {
      todoCount++;

      if (normalizeTodo(item).completed) {
        completedCount++;
      }
    });
  });

  const rate = todoCount
    ? Math.round(completedCount / todoCount * 100)
    : 0;

  const summary = document.createElement("div");
  summary.style.cssText = `
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:12px;
    margin-bottom:20px;
  `;

  [
    ["予定数", `${eventCount}件`],
    ["ToDo達成率", `${rate}%`],
    ["ToDo完了", `${completedCount}件`],
    ["ToDo合計", `${todoCount}件`]
  ].forEach(([label,value]) => {
    const card = document.createElement("div");
    card.style.cssText = `
      padding:16px;
      background:#242124;
      border:1px solid #4D4135;
      border-radius:12px;
    `;

    const labelEl = document.createElement("div");
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color:#A6A19A;
      font-size:12px;
      margin-bottom:8px;
    `;

    const valueEl = document.createElement("div");
    valueEl.textContent = value;
    valueEl.style.cssText = `
      color:#EADBBC;
      font-size:24px;
      font-weight:bold;
    `;

    card.append(labelEl,valueEl);
    summary.append(card);
  });

  reportBody39.append(summary);

  const heading = document.createElement("h3");
  heading.textContent = "カテゴリー別の予定数";
  heading.style.cssText = `
    color:#EADBBC;
    font-size:15px;
    margin-bottom:16px;
  `;

  reportBody39.append(heading);

  if (eventCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "この月の予定はありません。";
    empty.style.color = "#A6A19A";
    reportBody39.append(empty);
    return;
  }

  Object.entries(categoryCounts)
    .sort((a,b) => b[1] - a[1])
    .forEach(([id,count]) => {
      const category = categoryOf(id);

      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "15px";

      const labelRow = document.createElement("div");
      labelRow.style.cssText = `
        display:flex;
        justify-content:space-between;
        color:#EADBBC;
        font-size:12px;
        margin-bottom:7px;
      `;

      const name = document.createElement("span");
      name.textContent = category.name;

      const number = document.createElement("span");
      number.textContent = `${count}件`;

      labelRow.append(name,number);

      const track = document.createElement("div");
      track.style.cssText = `
        width:100%;
        height:8px;
        background:#353136;
        border-radius:20px;
        overflow:hidden;
      `;

      const bar = document.createElement("div");
      bar.style.cssText = `
        width:${count / eventCount * 100}%;
        height:100%;
        background:${category.color};
        border-radius:20px;
      `;

      track.append(bar);
      wrapper.append(labelRow,track);
      reportBody39.append(wrapper);
    });
}

// 開閉
reportToggle39.addEventListener("click", () => {
  reportContent39.hidden = !reportContent39.hidden;

  if (!reportContent39.hidden) {
    renderReport39();
  }
});

// 前月
reportPrev39.addEventListener("click", () => {
  reportMonth39 = new Date(
    reportMonth39.getFullYear(),
    reportMonth39.getMonth() - 1,
    1
  );

  renderReport39();
});

// 翌月
reportNext39.addEventListener("click", () => {
  reportMonth39 = new Date(
    reportMonth39.getFullYear(),
    reportMonth39.getMonth() + 1,
    1
  );

  renderReport39();
});

// シークレットモードではレポートを閉じる
secretButton35.addEventListener("click", () => {
  if (secretMode35) {
    reportContent39.hidden = true;
  }
});

/* STEP 39追加：月間ToDo一覧 */

const todoDetails39 = document.createElement("div");
todoDetails39.hidden = true;

todoDetails39.style.cssText = `
  margin:14px 0;
  padding:14px;
  background:#242124;
  border:1px solid #66563D;
  border-radius:12px;
`;

reportBody39.before(todoDetails39);

function showMonthlyTodos39() {
  todoDetails39.innerHTML = "";

  const year = reportMonth39.getFullYear();
  const month = String(
    reportMonth39.getMonth()+1
  ).padStart(2,"0");

  const prefix = `${year}-${month}-`;

  const heading = document.createElement("h3");
  heading.textContent = `${year}年${Number(month)}月のToDo一覧`;
  heading.style.color = "#EADBBC";

  todoDetails39.append(heading);

  let count = 0;

  Object.keys(tasks).sort().forEach(key => {
    if (!key.startsWith(prefix)) return;
    if (!Array.isArray(tasks[key])) return;

    tasks[key].forEach(item => {
      const todo = normalizeTodo(item);
      count++;

      const row = document.createElement("div");

      row.textContent =
        `${Number(key.slice(8))}日  ` +
        `${todo.completed ? "✓" : "○"}  ${todo.text}`;

      row.style.cssText = `
        padding:10px 0;
        color:#EADBBC;
        border-bottom:1px solid #40372F;
        overflow-wrap:anywhere;
      `;

      todoDetails39.append(row);
    });
  });

  if (count === 0) {
    const empty = document.createElement("p");
    empty.textContent = "この月のToDoはありません。";
    empty.style.color = "#A6A19A";
    todoDetails39.append(empty);
  }
}

// 「ToDo合計」を押すと一覧を表示
reportBody39.addEventListener("click", event => {
  const card = event.target.closest("div");

  if (!card) return;

  const summaryCards =
    reportBody39.querySelectorAll(
      "div[style*='padding: 16px']"
    );

  const totalCard = Array.from(summaryCards).find(
    element => element.textContent.includes("ToDo合計")
  );

  if (!totalCard || !totalCard.contains(event.target)) {
    return;
  }

  todoDetails39.hidden = !todoDetails39.hidden;

  if (!todoDetails39.hidden) {
    showMonthlyTodos39();
  }
});

// 月を切り替えたら一覧を閉じる
reportPrev39.addEventListener("click", () => {
  todoDetails39.hidden = true;
});

reportNext39.addEventListener("click", () => {
  todoDetails39.hidden = true;
});

// レポートを閉じたら一覧も閉じる
reportToggle39.addEventListener("click", () => {
  if (reportContent39.hidden) {
    todoDetails39.hidden = true;
  }
});

// シークレットモードで一覧を閉じる
secretButton35.addEventListener("click", () => {
  if (secretMode35) {
    todoDetails39.hidden = true;
  }
});

/* =========================
   STEP 40：リマインダー機能
========================= */

(function () {
  "use strict";

  const KEY40 = "todoReminderSettings40";

  // 通知設定を読み込む
  let settings40 = {
    enabled: true,
    minutes: 30
  };

  try {
    const saved = JSON.parse(
      localStorage.getItem(KEY40) || "null"
    );

    if (saved && typeof saved === "object") {
      settings40.enabled = saved.enabled !== false;

      if ([0, 30, 60].includes(Number(saved.minutes))) {
        settings40.minutes = Number(saved.minutes);
      }
    }
  } catch (error) {
    console.error(error);
  }

  function saveSettings40() {
    localStorage.setItem(
      KEY40,
      JSON.stringify(settings40)
    );
  }

  // リマインダー設定画面
  const section40 = document.createElement("section");
  section40.className = "schedule";

  const toggle40 = document.createElement("button");
  toggle40.type = "button";
  toggle40.textContent = "✦ リマインダー設定";

  toggle40.style.cssText = `
    display:block;
    width:100%;
    background:#24201B;
    border:1px solid #C9B58B;
    color:#EADBBC;
  `;

  const panel40 = document.createElement("div");
  panel40.hidden = true;
  panel40.style.marginTop = "14px";

  const enabledLabel40 = document.createElement("label");

  enabledLabel40.style.cssText = `
    display:flex;
    align-items:center;
    gap:10px;
    color:#EADBBC;
    margin-bottom:14px;
  `;

  const enabled40 = document.createElement("input");
  enabled40.type = "checkbox";
  enabled40.checked = settings40.enabled;

  enabledLabel40.append(
    enabled40,
    document.createTextNode("リマインダーを有効にする")
  );

  const timeLabel40 = document.createElement("label");
  timeLabel40.textContent = "お知らせするタイミング";

  timeLabel40.style.cssText = `
    display:block;
    color:#C9B58B;
    font-size:13px;
    margin-bottom:8px;
  `;

  const select40 = document.createElement("select");

  select40.innerHTML = `
    <option value="60">1時間前</option>
    <option value="30">30分前</option>
    <option value="0">開始時刻</option>
  `;

  select40.value = String(settings40.minutes);

  select40.style.cssText = `
    display:block;
    width:100%;
    padding:12px;
    background:#242124;
    color:#EADBBC;
    border:1px solid #66563D;
    border-radius:10px;
  `;

  const note40 = document.createElement("p");
  note40.textContent =
    "アプリを開いている間に予定を確認します。";
  note40.style.cssText = `
    color:#A6A19A;
    font-size:12px;
    margin-top:12px;
  `;

  panel40.append(
    enabledLabel40,
    timeLabel40,
    select40,
    note40
  );

  section40.append(toggle40, panel40);

  // 月間レポートの下に配置
  const anchor40 =
    document.querySelector(".category-section");

  if (anchor40) {
    anchor40.before(section40);
  } else {
    document.body.append(section40);
  }

  toggle40.addEventListener("click", () => {
    panel40.hidden = !panel40.hidden;
  });

  enabled40.addEventListener("change", () => {
    settings40.enabled = enabled40.checked;
    saveSettings40();
  });

  select40.addEventListener("change", () => {
    settings40.minutes = Number(select40.value);
    saveSettings40();
  });

  // アプリ内のお知らせ画面
  const notice40 = document.createElement("div");

  notice40.hidden = true;

  notice40.style.cssText = `
    position:fixed;
    left:50%;
    top:70px;
    transform:translateX(-50%);
    width:min(90vw,380px);
    z-index:99990;
    padding:18px;
    background:#1C1B1D;
    border:1px solid #C9B58B;
    border-radius:16px;
    box-shadow:0 12px 35px rgba(0,0,0,.5);
    color:#EADBBC;
  `;

  // CSSの display 指定より hidden を優先
  notice40.style.display = "none";

  const heading40 = document.createElement("div");
  heading40.textContent = "REMINDER";
  heading40.style.cssText = `
    color:#C9B58B;
    font-size:12px;
    letter-spacing:2px;
    margin-bottom:10px;
  `;

  const message40 = document.createElement("div");

  message40.style.cssText = `
    font-size:14px;
    line-height:1.7;
    overflow-wrap:anywhere;
  `;

  const close40 = document.createElement("button");
  close40.type = "button";
  close40.textContent = "閉じる";

  close40.style.cssText = `
    display:block;
    width:100%;
    margin-top:14px;
    background:#24201B;
    border:1px solid #C9B58B;
    color:#EADBBC;
  `;

  notice40.append(
    heading40,
    message40,
    close40
  );

  document.body.append(notice40);

  function hideNotice40() {
    notice40.hidden = true;
    notice40.style.display = "none";
  }

  function showNotice40(message) {
    // シークレットモード中は表示しない
    if (typeof secretMode35 !== "undefined" &&
        secretMode35) {
      return;
    }

    message40.textContent = message;
    notice40.hidden = false;
    notice40.style.display = "block";
  }

  close40.addEventListener("click", hideNotice40);

  // シークレットモードでは通知を閉じる
  if (typeof secretButton35 !== "undefined") {
    secretButton35.addEventListener(
      "click",
      hideNotice40
    );
  }

  // 同じ予定を何度も通知しないための記録
  const notified40 = new Set();

  function checkReminders40() {
    if (!settings40.enabled) return;

    if (typeof secretMode35 !== "undefined" &&
        secretMode35) {
      hideNotice40();
      return;
    }

    const now = new Date();
    const todayKey = dateKey(now);

    const todayEvents = getDayEvents(todayKey);

    todayEvents.forEach((event, index) => {
      if (event.allDay || !event.time) return;

      const match = String(event.time).match(
        /^(\d{1,2}):(\d{2})$/
      );

      if (!match) return;

      const hour = Number(match[1]);
      const minute = Number(match[2]);

      if (hour > 23 || minute > 59) return;

      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute
      );

      const reminderTime = new Date(
        start.getTime() -
        settings40.minutes * 60000
      );

      const difference =
        now.getTime() - reminderTime.getTime();

      // 通知時刻から5分以内だけ表示
      if (difference < 0 || difference >= 300000) {
        return;
      }

      const id = [
        todayKey,
        index,
        event.title,
        event.time,
        settings40.minutes
      ].join("|");

      if (notified40.has(id)) return;

      notified40.add(id);

      const timing =
        settings40.minutes === 0
          ? "予定の開始時刻です。"
          : `予定の開始まであと${settings40.minutes}分です。`;

      showNotice40(
        `${timing}\n${event.time}　${event.title}`
      );
    });
  }

  // アプリを開いたとき・開いている間に確認
  checkReminders40();

  setInterval(checkReminders40, 30000);

  // タブに戻ったときにも確認
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        checkReminders40();
      }
    }
  );

})();

/* =========================
   STEP 41：予定の日付移動
========================= */

(function () {
  "use strict";

  let movingEvent41 = null;
  let moveTimer41 = null;
  let longPressed41 = false;

  // 移動中の案内
  const moveInfo41 = document.createElement("div");

  moveInfo41.hidden = true;

  moveInfo41.style.cssText = `
    position:fixed;
    bottom:24px;
    left:50%;
    transform:translateX(-50%);
    width:min(90%,420px);
    z-index:9990;
    padding:16px;
    background:#24201B;
    border:1px solid #C9B58B;
    border-radius:14px;
    color:#EADBBC;
    text-align:center;
    box-shadow:0 8px 25px rgba(0,0,0,.4);
  `;

  const moveMessage41 = document.createElement("div");
  moveMessage41.textContent =
    "移動先の日付を選択してください。";

  const cancelMove41 = document.createElement("button");
  cancelMove41.type = "button";
  cancelMove41.textContent = "キャンセル";

  cancelMove41.style.cssText = `
    margin-top:12px;
    background:#24201B;
    border:1px solid #C9B58B;
    color:#EADBBC;
  `;

  moveInfo41.append(moveMessage41,cancelMove41);
  document.body.append(moveInfo41);

  function stopMove41() {
    movingEvent41 = null;
    moveInfo41.hidden = true;
  }

  cancelMove41.addEventListener("click",stopMove41);

  // 長押しする予定を記録
  function beginMove41(card) {
    const cards = Array.from(
      $("eventList").querySelectorAll(".event-card")
    );

    const index = cards.indexOf(card);

    if (index < 0) return;

    const key = selectedDateKey();
    const event = getDayEvents(key)[index];

    if (!event) return;

    movingEvent41 = {
      fromKey:key,
      event:event
    };

    longPressed41 = true;

    moveMessage41.textContent =
      "移動先の日付をカレンダーから選択してください。";

    moveInfo41.hidden = false;

    // カレンダーへ移動
    document.querySelector(".calendar")
      .scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
  }

  // 予定カードを長押し
  const eventList41 = $("eventList");

  eventList41.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;

    const card = event.target.closest(".event-card");
    if (!card) return;

    clearTimeout(moveTimer41);
    longPressed41 = false;

    moveTimer41 = setTimeout(() => {
      beginMove41(card);
    }, 650);
  });

  ["pointerup","pointercancel","pointerleave"].forEach(type => {
    eventList41.addEventListener(type, () => {
      clearTimeout(moveTimer41);
    });
  });

  // 移動先の日付を選択
  $("dates").addEventListener("click", event => {
    if (!movingEvent41) return;

    const button = event.target.closest(
      ".calendar-date"
    );

    if (!button) return;

    // クリック前に選択された日付を使用
    const toKey = selectedDateKey();
    const fromKey = movingEvent41.fromKey;
    const item = movingEvent41.event;

    if (fromKey === toKey) {
      stopMove41();
      return;
    }

    const source = getDayEvents(fromKey);
    const index = source.indexOf(item);

    if (index < 0) {
      stopMove41();
      alert("移動する予定が見つかりません。");
      return;
    }

    const target = getDayEvents(toKey);

    const duplicate = target.some(existing =>
      String(existing.title || "").trim().toLowerCase() ===
      String(item.title || "").trim().toLowerCase()
    );

    if (duplicate) {
      stopMove41();
      alert("移動先に同じ名前の予定があります。");
      return;
    }

    if (!confirm(
      "この予定を選択した日付に移動しますか？"
    )) {
      stopMove41();
      return;
    }

    if (!Array.isArray(events[toKey])) {
      events[toKey] = [];
    }

    events[toKey].push({...item});
    source.splice(index,1);

    saveEvents();

    stopMove41();

    renderCalendar();
    renderSchedule();

    alert("予定を移動しました。");

  }, false);

})();

/* =========================
   STEP 42：テーマ切り替え
========================= */

(function () {
  "use strict";

  const THEME_KEY42 = "todoTheme42";

  // テーマ設定エリア
  const themeSection42 =
    document.createElement("section");

  themeSection42.className = "schedule";

  const themeToggle42 =
    document.createElement("button");

  themeToggle42.type = "button";
  themeToggle42.textContent = "✦ デザイン設定";

  const themePanel42 =
    document.createElement("div");

  themePanel42.className = "theme-panel42";
  themePanel42.hidden = true;

  const themeLabel42 =
    document.createElement("div");

  themeLabel42.textContent = "テーマを選択";

  themeLabel42.style.cssText = `
    margin-bottom:12px;
    font-size:13px;
  `;

  const themeSelect42 =
    document.createElement("select");

  themeSelect42.innerHTML = `
    <option value="black">BLACK SATIN</option>
    <option value="ivory">IVORY GOLD</option>
  `;

  themeSelect42.style.width = "100%";

  themePanel42.append(
    themeLabel42,
    themeSelect42
  );

  themeSection42.append(
    themeToggle42,
    themePanel42
  );

  // データ管理の前に設置
  const backup42 =
    document.querySelector(".backup-section");

  if (backup42) {
    backup42.before(themeSection42);
  } else {
    document.body.append(themeSection42);
  }

  // テーマ適用
  function applyTheme42(theme) {
    const ivory = theme === "ivory";

    document.body.classList.toggle(
      "theme-ivory42",
      ivory
    );

    themeSelect42.value =
      ivory ? "ivory" : "black";

    localStorage.setItem(
      THEME_KEY42,
      ivory ? "ivory" : "black"
    );
  }

  // 保存されたテーマを読み込む
  let savedTheme42 = "black";

  try {
    savedTheme42 =
      localStorage.getItem(THEME_KEY42) || "black";
  } catch (error) {
    savedTheme42 = "black";
  }

  applyTheme42(savedTheme42);

  // 開閉
  themeToggle42.addEventListener("click", () => {
    themePanel42.hidden = !themePanel42.hidden;
  });

  // 切り替え
  themeSelect42.addEventListener("change", () => {
    applyTheme42(themeSelect42.value);
  });

  // シークレットモード中は設定を閉じる
  if (typeof secretButton35 !== "undefined") {
    secretButton35.addEventListener("click", () => {
      if (secretMode35) {
        themePanel42.hidden = true;
      }
    });
  }

})();

/* =========================
   STEP 43：完全バックアップ
========================= */

(function () {
  "use strict";

  const section43 = document.createElement("section");
  section43.className = "schedule";

  const toggle43 = document.createElement("button");
  toggle43.type = "button";
  toggle43.textContent = "✦ 完全バックアップ";

  const panel43 = document.createElement("div");
  panel43.hidden = true;
  panel43.style.cssText = "margin-top:14px;";

  const description43 = document.createElement("p");
  description43.textContent =
    "予定・ToDo・カテゴリー・テンプレート・デザイン・リマインダー設定を保存します。";

  const export43 = document.createElement("button");
  export43.type = "button";
  export43.textContent = "↓ 完全バックアップを保存";

  const import43 = document.createElement("button");
  import43.type = "button";
  import43.textContent = "↑ 完全バックアップから復元";

  const file43 = document.createElement("input");
  file43.type = "file";
  file43.accept = ".json,application/json";
  file43.hidden = true;

  [toggle43, export43, import43].forEach(button => {
    button.style.cssText = `
      display:block;
      width:100%;
      margin:10px 0;
      padding:13px;
      background:#24201B;
      color:#EADBBC;
      border:1px solid #C9B58B;
      border-radius:10px;
    `;
  });

  panel43.append(
    description43,
    export43,
    import43,
    file43
  );

  section43.append(toggle43, panel43);
  document.body.append(section43);

  toggle43.addEventListener("click", () => {
    panel43.hidden = !panel43.hidden;
  });

  // 完全バックアップを保存
  export43.addEventListener("click", () => {
    try {
      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        events: events,
        tasks: tasks,
        categories: categories,
        templates: JSON.parse(
          localStorage.getItem(
            "todoEventTemplates36"
          ) || "[]"
        ),
        theme: localStorage.getItem(
          "todoTheme42"
        ) || "black",
        reminderSettings: JSON.parse(
          localStorage.getItem(
            "todoReminderSettings40"
          ) || '{"enabled":true,"minutes":30}'
        )
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const date = new Date();
      const name = [
        date.getFullYear(),
        String(date.getMonth()+1).padStart(2,"0"),
        String(date.getDate()).padStart(2,"0")
      ].join("-");

      link.href = url;
      link.download = `Todo_FullBackup_${name}.json`;

      document.body.append(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);

    } catch (error) {
      console.error(error);
      alert("バックアップを保存できませんでした。");
    }
  });

  // 完全バックアップから復元
  import43.addEventListener("click", () => {
    file43.click();
  });

  file43.addEventListener("change", async () => {
    const file = file43.files[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());

      const validObject = value =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

      if (
        data.version !== 2 ||
        !validObject(data.events) ||
        !validObject(data.tasks) ||
        !Array.isArray(data.categories) ||
        !Array.isArray(data.templates) ||
        !["black","ivory"].includes(data.theme) ||
        !validObject(data.reminderSettings)
      ) {
        throw new Error("Invalid backup");
      }

      if (
        !confirm(
          "現在の予定・ToDo・設定をバックアップの内容で上書きしますか？"
        )
      ) return;

      // 復元前の状態を退避
      const keys = [
        "todoEvents",
        "todoTasks",
        "todoCategories",
        "todoEventTemplates36",
        "todoTheme42",
        "todoReminderSettings40"
      ];

      const previous = keys.map(key =>
        localStorage.getItem(key)
      );

      const values = [
        data.events,
        data.tasks,
        data.categories,
        data.templates,
        data.theme,
        data.reminderSettings
      ];

      try {
        keys.forEach((key, index) => {
          localStorage.setItem(
            key,
            index === 4
              ? values[index]
              : JSON.stringify(values[index])
          );
        });
      } catch (error) {
        keys.forEach((key, index) => {
          if (previous[index] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, previous[index]);
          }
        });
        throw error;
      }

      alert(
        "復元しました。画面を再読み込みします。"
      );

      location.reload();

    } catch (error) {
      console.error(error);
      alert(
        "復元できませんでした。ファイルを確認してください。"
      );
    } finally {
      file43.value = "";
    }
  });

  // シークレットモードでは設定を閉じる
  if (typeof secretButton35 !== "undefined") {
    secretButton35.addEventListener("click", () => {
      if (secretMode35) {
        panel43.hidden = true;
      }
    });
  }

})();

/* STEP 48 新版：6桁PINと数字キーパッド */
(function () {
  "use strict";

  const KEY = "todoPinHash48";
  const LOCK = "todoLocked48";
  let pin = "";
  let busy = false;
  let saved = localStorage.getItem(KEY);

  const panel = document.createElement("div");
  panel.id = "pinLock48";
  panel.style.cssText = `
    position:fixed;inset:0;z-index:100001;
    background:#0B0B0D;color:#EADBBC;
    display:none;align-items:center;justify-content:center;
    padding:20px;box-sizing:border-box;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    width:min(100%,420px);text-align:center;
    background:#171719;border:1px solid #66563D;
    border-radius:20px;padding:22px;
    box-sizing:border-box;
  `;

  const title = document.createElement("h2");
  title.textContent = "✦ PRIVATE ACCESS";
  title.style.cssText =
    "color:#D6B875;font-size:19px;letter-spacing:2px;";

  const message = document.createElement("p");
  message.style.cssText =
    "color:#B7AEA0;font-size:12px;min-height:36px;";

  const dots = document.createElement("div");
  dots.style.cssText =
    "display:flex;justify-content:center;gap:13px;margin:20px 0;";

  const circles = [];
  for (let i = 0; i < 6; i++) {
    const dot = document.createElement("span");
    dot.style.cssText = `
      width:13px;height:13px;border-radius:50%;
      border:1px solid #D6B875;display:block;
    `;
    dots.append(dot);
    circles.push(dot);
  }

  const keypad = document.createElement("div");
  keypad.style.cssText = `
    display:grid;grid-template-columns:repeat(3,1fr);
    gap:10px;margin:18px 0;
  `;

  const action = document.createElement("button");
  action.type = "button";
  action.style.cssText = `
    width:100%;padding:14px;border-radius:12px;
    background:#C9B58B;color:#171719;
    border:0;font-weight:bold;
  `;

  function draw() {
    circles.forEach((dot, i) => {
      dot.style.background =
        i < pin.length ? "#D6B875" : "transparent";
    });
  }

  function addDigit(digit) {
    if (busy || pin.length >= 6) return;
    pin += digit;
    draw();
  }

/* STEP 49：キーボード入力対応 */
document.addEventListener("keydown", function (e) {
  if (panel.style.display !== "flex") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    addDigit(e.key);
  } else if (e.key === "Backspace") {
    e.preventDefault();
    if (busy) return;
    pin = pin.slice(0, -1);
    draw();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (!busy && pin.length === 6) {
      action.click();
    }
  }
});

  ["1","2","3","4","5","6","7","8","9","","0","⌫"]
    .forEach(value => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = value;
      button.disabled = value === "";
      button.style.cssText = `
        min-height:58px;border-radius:12px;
        background:${value ? "#252326" : "transparent"};
        color:#EADBBC;border:${value ? "1px solid #554733" : "0"};
        font-size:23px;touch-action:manipulation;
      `;
      button.addEventListener("click", () => {
        if (value === "⌫") {
          pin = pin.slice(0,-1);
          draw();
        } else {
          addDigit(value);
        }
      });
      keypad.append(button);
    });

  async function hash(value) {
    const data = new TextEncoder().encode(value);
    const result = await crypto.subtle.digest("SHA-256",data);
    return Array.from(new Uint8Array(result))
      .map(b => b.toString(16).padStart(2,"0"))
      .join("");
  }

  function show() {
    pin = "";
    draw();
    saved = localStorage.getItem(KEY);
    message.textContent = saved
      ? "6桁の暗証番号を入力してください。"
      : "新しい6桁の暗証番号を設定してください。";
    action.textContent = saved
      ? "ロック解除" : "暗証番号を設定";
    panel.style.display = "flex";
  }

  function unlock() {
    localStorage.setItem(LOCK,"0");
    secretMode35 = false;
    secretScreen35.style.display = "none";
    secretButton35.textContent = "◉";
    panel.style.display = "none";
    pin = "";
    draw();
  }

  action.addEventListener("click", async () => {
    if (busy) return;
    if (pin.length !== 6) {
      message.textContent = "数字を6桁入力してください。";
      return;
    }

    busy = true;
    try {
      const hashed = await hash(pin);

      if (!saved) {
        localStorage.setItem(KEY,hashed);
        saved = hashed;
        unlock();
      } else if (hashed === saved) {
        unlock();
      } else {
        message.textContent = "暗証番号が違います。";
        pin = "";
        draw();
      }
    } catch (error) {
      console.error(error);
      message.textContent = "認証処理に失敗しました。";
    } finally {
      busy = false;
    }
  });

  box.append(title,message,dots,keypad,action);
  panel.append(box);
  document.body.append(panel);

  function lock() {
    localStorage.setItem(LOCK,"1");
    secretMode35 = true;
    secretScreen35.style.display = "flex";
    secretButton35.textContent = "◎";
    show();
  }

  // 元のボタンの解除処理は削除済み
  secretButton35.addEventListener("click", () => {
    if (localStorage.getItem(LOCK) === "1") {
      show();
    } else {
      lock();
    }
  });

  // 再読み込みしてもロックを維持
  if (localStorage.getItem(LOCK) === "1") {
    secretMode35 = true;
    secretScreen35.style.display = "flex";
    secretButton35.textContent = "◎";
    show();
  }
})();
