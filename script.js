
   (function () {
    /* Storage  */
    const STORAGE_KEY = "todo_tasks_v1";
  
    /** @type {{id:string,text:string,done:boolean}[]} */
    let tasks = read();
  
    function read() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    }
    function write() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  
    //DOM refs
    const form = document.getElementById("taskForm");
    const taskInput = document.getElementById("taskInput");
    const list = document.getElementById("taskList");
    const clearDoneBtn = document.getElementById("clearDone");
    const live = document.getElementById("live");
  
    const counters = {
      all: document.getElementById("countAll"),
      open: document.getElementById("countOpen"),
      done: document.getElementById("countDone"),
    };
  
    const filterButtons = Array.from(document.querySelectorAll(".chip"));
    let filter = "all"; // 'all' | 'open' | 'done'
  
    //rendering
    function render() {
      // Filter the model before rendering
      const view = filter === "open"
        ? tasks.filter(t => !t.done)
        : filter === "done"
        ? tasks.filter(t => t.done)
        : tasks;
  
      // Build list
      list.innerHTML = "";
      for (const t of view) list.appendChild(renderItem(t));
  
      // Update counters
      counters.all.textContent = String(tasks.length);
      counters.done.textContent = String(tasks.filter(t => t.done).length);
      counters.open.textContent = String(tasks.filter(t => !t.done).length);
  
      // Persist
      write();
    }
  
    // Create a <li> for one task
    function renderItem(task) {
      const li = document.createElement("li");
      li.className = "task";
      li.dataset.id = task.id;
      li.draggable = true;
      li.setAttribute("aria-grabbed", "false");
  
      // Drag handle (⋮⋮)
      const drag = document.createElement("div");
      drag.className = "task__drag";
      drag.title = "Drag to reorder";
      drag.textContent = "⋮⋮";
  
      // Checkbox: mark done / open
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = task.done;
      cb.addEventListener("change", () => {
        task.done = cb.checked;
        announce(task.done ? "Marked complete" : "Marked open");
        render();
      });
  
      // Title text (or editor if editing)
      const title = document.createElement("span");
      title.className = "task__title" + (task.done ? " is-done" : "");
      title.textContent = task.text;
      title.addEventListener("dblclick", () => startEdit(li, task)); // quick edit
  
      // Actions (Edit/Delete)
      const actions = document.createElement("div");
      actions.className = "task__actions";
      const editBtn = iconBtn("Edit");
      const delBtn = iconBtn("Delete", "delete");
      actions.append(editBtn, delBtn);
  
      editBtn.addEventListener("click", () => startEdit(li, task));
      delBtn.addEventListener("click", () => {
        tasks = tasks.filter(t => t.id !== task.id);
        announce("Task deleted");
        render();
      });
  
      // Assemble row
      li.append(drag, cb, title, actions);
  
      // Drag & drop behavior
      // TODO: Drag and drop not working
      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", task.id);
        li.setAttribute("aria-grabbed", "true");
      });
      li.addEventListener("dragend", () => {
        li.setAttribute("aria-grabbed", "false");
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault(); // allow drop
        const after = getAfterElement(list, e.clientY);
        const draggingId = e.dataTransfer.getData("text/plain");
        const draggingEl = [...list.children].find(el => el.dataset.id === draggingId);
        if (!draggingEl || draggingEl === li) return;
        if (after == null) list.appendChild(draggingEl);
        else list.insertBefore(draggingEl, after);
      });
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        const order = [...list.children].map(el => el.dataset.id);
        tasks.sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
        announce("Tasks reordered");
        render();
      });
  
      return li;
    }
  
    // Styled small button
    function iconBtn(label, extraClass = "") {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "icon-btn" + (extraClass ? " " + extraClass : "");
      b.textContent = label;
      return b;
    }
  
    // Inline editor UX
    function startEdit(li, task) {
      const titleSpan = li.querySelector(".task__title");
      const actions = li.querySelector(".task__actions");
  
      const input = document.createElement("input");
      input.className = "edit";
      input.value = task.text;
      titleSpan.replaceWith(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
  
      const saveBtn = iconBtn("Save", "save");
      const cancelBtn = iconBtn("Cancel");
      actions.replaceChildren(saveBtn, cancelBtn);
  
      const commit = () => {
        const v = input.value.trim();
        if (v) {
          task.text = v;
          announce("Task edited");
        }
        render();
      };
      const cancel = () => render();
  
      saveBtn.addEventListener("click", commit);
      cancelBtn.addEventListener("click", cancel);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      });
    }
  
    // Decide where to insert dragging element based on cursor Y
    // TODO: drag and drop not working
    function getAfterElement(container, mouseY) {
      const els = [...container.querySelectorAll(".task:not([aria-grabbed='true'])")];
      return els.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = mouseY - box.top - box.height / 2;
        return offset < 0 && offset > closest.offset
          ? { offset, element: child }
          : closest;
      }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }
  
    //announcements for screen readers
    function announce(msg){ live.textContent = msg; }
  
    /* Events: add / filter / clear */
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = taskInput.value.trim();
      if (!text) return;
      tasks.push({ id: crypto.randomUUID(), text, done: false });
      taskInput.value = "";
      announce("Task added");
      render();
      taskInput.focus();
    });
  
    clearDoneBtn.addEventListener("click", () => {
      const had = tasks.some(t => t.done);
      tasks = tasks.filter(t => !t.done);
      if (had) announce("Cleared completed");
      render();
    });
  
    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        filter = btn.dataset.filter;
        render();
      });
    });
  
    render();
  })();
  