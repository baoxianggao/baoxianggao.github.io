import {
  initializeDefaults,
  listTodos,
  upsertTodo,
  removeTodo,
  materializeRecurringTodos,
  STORAGE_KEYS,
  onStateChanged
} from "../core/store.js";
import {
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  toInputDateTimeValue,
  formatDateTime,
  formatDayKey
} from "../core/date.js";

initializeDefaults();

const todoForm = document.getElementById("todoForm");
const todoListEl = document.getElementById("todoList");
const todoFilterSelect = document.getElementById("todoFilterSelect");
const todoDueAtInput = document.getElementById("todoDueAt");
const todoStatAllEl = document.getElementById("todoStatAll");
const todoStatDoingEl = document.getElementById("todoStatDoing");
const todoStatDoneEl = document.getElementById("todoStatDone");

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

  const occ = materializeRecurringTodos(start.toISOString(), end.toISOString());
  const byId = new Map(todos.map((todo) => [todo.id, todo]));

  return occ
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

function renderStats() {
  const todos = listTodos({ includeArchived: false });
  todoStatAllEl.textContent = String(todos.length);
  todoStatDoingEl.textContent = String(todos.filter((todo) => todo.status === "doing").length);
  todoStatDoneEl.textContent = String(todos.filter((todo) => todo.status === "done").length);
}

function renderTodoList() {
  const filter = todoFilterSelect.value;
  const items = collectVisibleItems(filter).sort(
    (a, b) => new Date(a.occurrenceISO || a.dueAtISO).getTime() - new Date(b.occurrenceISO || b.dueAtISO).getTime()
  );

  if (items.length === 0) {
    todoListEl.innerHTML = '<li class="todo-item"><span class="muted">当前筛选条件下暂无任务</span></li>';
    return;
  }

  todoListEl.innerHTML = items
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : "";
      const statusText = item.status === "doing" ? "进行中" : item.status === "done" ? "已完成" : "待办";
      const repeatText =
        item.repeat === "hourly"
          ? "每小时"
          : item.repeat === "daily"
          ? "每天"
          : item.repeat === "weekly"
          ? "每周"
          : item.repeat === "monthly"
          ? "每月"
          : "不重复";

      return `
      <li class="todo-item" data-id="${item.id}">
        <div>
          <h3 class="todo-title">${escapeHtml(item.title)}</h3>
          <div class="todo-meta">${formatDateTime(item.occurrenceISO || item.dueAtISO)} · ${statusText} · ${repeatText}</div>
          ${item.note ? `<div class="muted" style="margin-top: 6px">${escapeHtml(item.note)}</div>` : ""}
          <div class="chips" style="margin-top: 8px">
            <span class="tag ${item.priority}">${item.priority}</span>
            ${tags}
          </div>
        </div>
        <div class="todo-actions">
          <button class="btn" data-action="cycle">下一状态</button>
          <button class="btn" data-action="archive">归档</button>
          <button class="btn btn-danger" data-action="delete">删除</button>
        </div>
      </li>
    `;
    })
    .join("");
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
    }
  });
}

function bindForm() {
  todoDueAtInput.value = toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));

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

    upsertTodo({
      title,
      note,
      dueAtISO: new Date(dueAt).toISOString(),
      repeat,
      status: "todo",
      priority,
      tags
    });

    todoForm.reset();
    todoDueAtInput.value = toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
    document.getElementById("todoPriority").value = "medium";
    document.getElementById("todoRepeat").value = "none";
  });
}

function bootstrap() {
  bindForm();
  bindListActions();

  todoFilterSelect.addEventListener("change", renderTodoList);

  onStateChanged((detail) => {
    if (detail.key === STORAGE_KEYS.todos) {
      renderTodoList();
      renderStats();
    }
  });

  renderTodoList();
  renderStats();
}

bootstrap();
