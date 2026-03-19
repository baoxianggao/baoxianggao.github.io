import {
  DEFAULT_CLOCK_STATE,
  initializeDefaults,
  listTodos,
  materializeRecurringTodos,
  onStateChanged,
  removeTodo,
  STORAGE_KEYS,
  upsertTodo
} from "../core/store.js";
import {
  endOfMonth,
  endOfToday,
  endOfWeek,
  formatDateTime,
  startOfMonth,
  startOfToday,
  startOfWeek,
  toInputDateTimeValue
} from "../core/date.js";
import { bootI18n, isEnglish, tr, applyLangToLinks, setText, setPlaceholder } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const todoForm = document.getElementById("todoForm");
const todoListEl = document.getElementById("todoList");
const todoFilterSelect = document.getElementById("todoFilterSelect");
const todoDueAtInput = document.getElementById("todoDueAt");
const todoStatAllEl = document.getElementById("todoStatAll");
const todoStatDoingEl = document.getElementById("todoStatDoing");
const todoStatDoneEl = document.getElementById("todoStatDone");
const todoModePillEl = document.getElementById("todoModePill");
const todoSearchInputEl = document.getElementById("todoSearchInput");
const todoTagFilterEl = document.getElementById("todoTagFilter");
const todoPriorityFilterEl = document.getElementById("todoPriorityFilter");
const todoSortSelectEl = document.getElementById("todoSortSelect");

let editingTodoId = "";
let searchKeyword = "";
let selectedTag = "";
let selectedPriority = "";
let selectedSort = "due-asc";

const locale = isEnglish() ? "en-US" : "zh-CN";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cycleStatus(status) {
  if (status === "todo") return "doing";
  if (status === "doing") return "done";
  if (status === "done") return "todo";
  return "todo";
}

function statusLabel(status) {
  if (status === "doing") return tr("进行中", "In progress");
  if (status === "done") return tr("已完成", "Done");
  if (status === "archived") return tr("已归档", "Archived");
  return tr("待办", "Todo");
}

function repeatLabel(repeat) {
  if (repeat === "hourly") return tr("每小时", "Hourly");
  if (repeat === "daily") return tr("每天", "Daily");
  if (repeat === "weekly") return tr("每周", "Weekly");
  if (repeat === "monthly") return tr("每月", "Monthly");
  return tr("不重复", "No repeat");
}

function priorityWeight(priority) {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function getWindowByFilter(filter) {
  const now = new Date();
  if (filter === "today") {
    return [startOfToday(), endOfToday()];
  }
  if (filter === "24h") {
    return [now, new Date(Date.now() + 24 * 60 * 60 * 1000)];
  }
  if (filter === "week") {
    return [startOfWeek(now), endOfWeek(now)];
  }
  if (filter === "month") {
    return [startOfMonth(now), endOfMonth(now)];
  }
  return [null, null];
}

function collectVisibleItems(filter) {
  const todos = listTodos({ includeArchived: false });

  if (filter === "done") {
    return todos.filter((todo) => todo.status === "done").map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  if (filter === "expired") {
    const nowMs = Date.now();
    return todos
      .filter((todo) => todo.status !== "done" && new Date(todo.dueAtISO).getTime() < nowMs)
      .map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  if (filter === "all") {
    return todos.map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  const [start, end] = getWindowByFilter(filter);
  if (!start || !end) {
    return todos.map((todo) => ({ ...todo, occurrenceISO: todo.dueAtISO }));
  }

  const occurrences = materializeRecurringTodos(start.toISOString(), end.toISOString());
  const byId = new Map(todos.map((todo) => [todo.id, todo]));

  return occurrences
    .map((item) => {
      const base = byId.get(item.todoId);
      if (!base || base.status === "archived") {
        return null;
      }
      return {
        ...base,
        occurrenceISO: item.startISO
      };
    })
    .filter(Boolean);
}

function filteredAndSortedItems() {
  const items = collectVisibleItems(todoFilterSelect.value)
    .filter((todo) => {
      if (!searchKeyword) {
        return true;
      }
      return `${todo.title} ${todo.note} ${todo.tags.join(" ")}`.toLowerCase().includes(searchKeyword);
    })
    .filter((todo) => (selectedTag ? todo.tags.includes(selectedTag) : true))
    .filter((todo) => (selectedPriority ? todo.priority === selectedPriority : true));

  return items.sort((a, b) => {
    const timeA = new Date(a.occurrenceISO || a.dueAtISO).getTime();
    const timeB = new Date(b.occurrenceISO || b.dueAtISO).getTime();
    if (selectedSort === "due-desc") {
      return timeB - timeA;
    }
    if (selectedSort === "updated-desc") {
      return new Date(b.updatedAtISO).getTime() - new Date(a.updatedAtISO).getTime();
    }
    if (selectedSort === "priority-desc") {
      const diff = priorityWeight(b.priority) - priorityWeight(a.priority);
      return diff === 0 ? timeA - timeB : diff;
    }
    return timeA - timeB;
  });
}

function renderTagFilter() {
  const tags = Array.from(new Set(listTodos({ includeArchived: false }).flatMap((todo) => todo.tags))).sort();
  todoTagFilterEl.innerHTML = [`<option value="">${tr("全部标签", "All tags")}</option>`]
    .concat(tags.map((tag) => `<option value="${escapeHtml(tag)}">#${escapeHtml(tag)}</option>`))
    .join("");
  todoTagFilterEl.value = selectedTag;
}

function renderStats() {
  const todos = listTodos({ includeArchived: false });
  todoStatAllEl.textContent = String(todos.length);
  todoStatDoingEl.textContent = String(todos.filter((todo) => todo.status === "doing").length);
  todoStatDoneEl.textContent = String(todos.filter((todo) => todo.status === "done").length);
}

function renderTodoList() {
  const items = filteredAndSortedItems();
  if (items.length === 0) {
    todoListEl.innerHTML = `<li class="todo-item"><span class="muted">${tr(
      "当前筛选条件下暂无任务",
      "No tasks under current filter"
    )}</span></li>`;
    return;
  }

  todoListEl.innerHTML = items
    .map((item) => {
      const occurrenceISO = item.occurrenceISO || item.dueAtISO;
      const isOverdue = item.status !== "done" && item.status !== "archived" && new Date(occurrenceISO).getTime() < Date.now();
      const tags = item.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("");
      return `
        <li class="todo-item ${isOverdue ? "is-overdue" : ""}" data-id="${item.id}">
          <div>
            <div class="todo-item-top">
              <h3 class="todo-title">${escapeHtml(item.title)}</h3>
              ${isOverdue ? `<span class="pill overdue-pill">${tr("已逾期", "Overdue")}</span>` : ""}
            </div>
            <div class="todo-meta">${formatDateTime(occurrenceISO, "Asia/Shanghai", locale)} · ${statusLabel(item.status)} · ${repeatLabel(item.repeat)}</div>
            ${item.note ? `<div class="muted" style="margin-top: 6px">${escapeHtml(item.note)}</div>` : ""}
            <div class="chips" style="margin-top: 10px">
              <span class="tag ${item.priority}">${item.priority}</span>
              ${tags}
            </div>
          </div>
          <div class="todo-actions">
            <button class="btn" data-action="edit">${tr("编辑", "Edit")}</button>
            <button class="btn btn-primary" data-action="focus">${tr("专注 25 分钟", "Focus 25 min")}</button>
            <button class="btn" data-action="cycle">${tr("下一状态", "Next status")}</button>
            <button class="btn" data-action="archive">${tr("归档", "Archive")}</button>
            <button class="btn btn-danger" data-action="delete">${tr("删除", "Delete")}</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function resetForm() {
  editingTodoId = "";
  todoForm.reset();
  todoDueAtInput.value = toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  document.getElementById("todoPriority").value = "medium";
  document.getElementById("todoRepeat").value = "none";
  todoModePillEl.textContent = "New";
  setText("#todoCreateTitle", "新建任务", "Create Task");
  setText("#todoSubmitBtn", "添加任务", "Add Task");
}

function loadTodoToForm(todo) {
  editingTodoId = todo.id;
  document.getElementById("todoTitle").value = todo.title;
  document.getElementById("todoNote").value = todo.note;
  document.getElementById("todoDueAt").value = toInputDateTimeValue(todo.dueAtISO);
  document.getElementById("todoRepeat").value = todo.repeat;
  document.getElementById("todoPriority").value = todo.priority;
  document.getElementById("todoTags").value = todo.tags.join(", ");
  todoModePillEl.textContent = tr("编辑中", "Editing");
  setText("#todoCreateTitle", "编辑任务", "Edit Task");
  setText("#todoSubmitBtn", "保存修改", "Save Changes");
}

function consumeActionParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("action") !== "new") {
    return;
  }
  resetForm();
  document.getElementById("todoTitle").focus();
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete("action");
  window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

function bindListActions() {
  todoListEl.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) {
      return;
    }
    const itemEl = actionBtn.closest("li[data-id]");
    const id = itemEl?.dataset.id;
    if (!id) {
      return;
    }

    const todo = listTodos({ includeArchived: true }).find((entry) => entry.id === id);
    if (!todo) {
      return;
    }

    const action = actionBtn.dataset.action;
    if (action === "delete") {
      removeTodo(id);
      return;
    }
    if (action === "archive") {
      upsertTodo({ ...todo, status: "archived" });
      return;
    }
    if (action === "cycle") {
      upsertTodo({ ...todo, status: cycleStatus(todo.status) });
      return;
    }
    if (action === "edit") {
      loadTodoToForm(todo);
      document.getElementById("todoTitle").focus();
      return;
    }
    if (action === "focus") {
      window.location.href = `/tools/focus-hub.html?action=start&mode=pomodoro&minutes=25&todoId=${encodeURIComponent(todo.id)}${
        isEnglish() ? "&lang=en" : ""
      }`;
    }
  });
}

function bindForm() {
  resetForm();

  todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.getElementById("todoTitle").value.trim();
    const note = document.getElementById("todoNote").value.trim();
    const dueAt = document.getElementById("todoDueAt").value;
    const repeat = document.getElementById("todoRepeat").value;
    const priority = document.getElementById("todoPriority").value;
    const tags = document.getElementById("todoTags").value;

    if (!title || !dueAt) {
      return;
    }

    const existing = editingTodoId ? listTodos({ includeArchived: true }).find((todo) => todo.id === editingTodoId) : null;
    upsertTodo({
      ...(existing || {}),
      id: editingTodoId,
      title,
      note,
      dueAtISO: new Date(dueAt).toISOString(),
      repeat,
      status: existing?.status || "todo",
      priority,
      tags
    });

    resetForm();
    renderTagFilter();
  });

  document.getElementById("todoCancelEditBtn").addEventListener("click", resetForm);
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - TodoList", "BaoXiangGao Tools - TodoList");
  setText("#todoBrandTitle", "TodoList（日/小时/周/月）", "TodoList (Day/Hour/Week/Month)");
  setText("#todoBackHomeBtn", "返回首页", "Back Home");
  setText("#todoOpenFocusBtn", "专注中心", "Focus Hub");
  setText("#todoCreateTitle", "新建任务", "Create Task");
  setText("#todoCreateHint", "支持编辑任务、重复规则、优先级和标签。", "Create or edit tasks with recurrence, priority, and tags.");
  setPlaceholder("#todoTitle", "任务标题", "Task title");
  setPlaceholder("#todoNote", "任务备注", "Task note");
  setText("#todoDueLabel", "截止时间", "Due time");
  setText("#todoRepeatLabel", "重复规则", "Repeat");
  setText("#todoPriorityLabel", "优先级", "Priority");
  setText("#todoTagsLabel", "标签（逗号分隔）", "Tags (comma separated)");
  setPlaceholder("#todoTags", "工作,学习", "work,study");
  setText("#todoSubmitBtn", "添加任务", "Add Task");
  setText("#todoCancelEditBtn", "取消编辑", "Cancel");
  setText("#todoStatAllLabel", "任务总数", "Total tasks");
  setText("#todoStatDoingLabel", "进行中", "In progress");
  setText("#todoStatDoneLabel", "已完成", "Done");
  setPlaceholder("#todoSearchInput", "搜索标题、备注或标签", "Search title, note, or tags");
  setText("#todoClearArchivedBtn", "清理已归档", "Clear Archived");

  const filterMap = {
    today: tr("今天", "Today"),
    "24h": tr("未来24小时", "Next 24 hours"),
    week: tr("本周", "This week"),
    month: tr("本月", "This month"),
    done: tr("已完成", "Done"),
    expired: tr("已过期", "Expired"),
    all: tr("全部", "All")
  };

  const repeatMap = {
    none: tr("不重复", "No repeat"),
    hourly: tr("每小时", "Hourly"),
    daily: tr("每天", "Daily"),
    weekly: tr("每周", "Weekly"),
    monthly: tr("每月", "Monthly")
  };

  const priorityMap = {
    high: tr("高", "High"),
    medium: tr("中", "Medium"),
    low: tr("低", "Low")
  };

  const sortMap = {
    "due-asc": tr("按时间升序", "Due ascending"),
    "due-desc": tr("按时间降序", "Due descending"),
    "updated-desc": tr("按最近更新", "Recently updated"),
    "priority-desc": tr("按优先级", "Priority")
  };

  document.querySelectorAll("#todoFilterSelect option").forEach((opt) => {
    if (filterMap[opt.value]) {
      opt.textContent = filterMap[opt.value];
    }
  });
  document.querySelectorAll("#todoRepeat option").forEach((opt) => {
    if (repeatMap[opt.value]) {
      opt.textContent = repeatMap[opt.value];
    }
  });
  document.querySelectorAll("#todoPriority option, #todoPriorityFilter option").forEach((opt) => {
    if (!opt.value) {
      opt.textContent = tr("全部优先级", "All priorities");
      return;
    }
    if (priorityMap[opt.value]) {
      opt.textContent = priorityMap[opt.value];
    }
  });
  document.querySelectorAll("#todoSortSelect option").forEach((opt) => {
    if (sortMap[opt.value]) {
      opt.textContent = sortMap[opt.value];
    }
  });
}

function bindFilters() {
  todoFilterSelect.addEventListener("change", renderTodoList);
  todoSearchInputEl.addEventListener("input", () => {
    searchKeyword = todoSearchInputEl.value.trim().toLowerCase();
    renderTodoList();
  });
  todoTagFilterEl.addEventListener("change", () => {
    selectedTag = todoTagFilterEl.value;
    renderTodoList();
  });
  todoPriorityFilterEl.addEventListener("change", () => {
    selectedPriority = todoPriorityFilterEl.value;
    renderTodoList();
  });
  todoSortSelectEl.addEventListener("change", () => {
    selectedSort = todoSortSelectEl.value;
    renderTodoList();
  });
  document.getElementById("todoClearArchivedBtn").addEventListener("click", () => {
    const archived = listTodos({ includeArchived: true }).filter((todo) => todo.status === "archived");
    if (archived.length === 0) {
      return;
    }
    const ok = window.confirm(
      tr(`确认清理 ${archived.length} 条已归档任务？`, `Delete ${archived.length} archived task(s)?`)
    );
    if (!ok) {
      return;
    }
    archived.forEach((todo) => removeTodo(todo.id));
  });
}

function bootstrap() {
  applyStaticI18n();
  bindForm();
  bindListActions();
  bindFilters();
  renderTagFilter();
  renderTodoList();
  renderStats();
  consumeActionParam();
  mountLauncher();
  applyLangToLinks();

  onStateChanged((detail) => {
    if (detail.key === STORAGE_KEYS.todos) {
      renderTagFilter();
      renderTodoList();
      renderStats();
    }
  });
}

bootstrap();
