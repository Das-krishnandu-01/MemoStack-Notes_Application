const COLORS = ['note-yellow', 'note-pink', 'note-blue', 'note-green', 'note-purple'];

class App {
    constructor() {
        this.notes = [];
        this.activeNoteId = null;
        this.currentViewMode = 'list'; // 'list' or 'board'
        this.token = localStorage.getItem('notes-app-token');
        this.isAuthenticated = !!this.token;
        this.baseUrl = 'http://localhost:5000/api';
        this.saveTimeout = null;

        // DOM Elements
        this.$app = document.getElementById('app');
        this.$loginView = document.getElementById('login-view');
        this.$dashboardView = document.getElementById('dashboard-view');
        this.$loginForm = document.getElementById('login-form');
        this.$notesList = document.getElementById('notes-list');
        this.$noteTitle = document.getElementById('note-title');
        this.$noteBody = document.getElementById('note-body');
        this.$addNoteBtn = document.getElementById('add-note-btn');
        this.$logoutBtn = document.getElementById('logout-btn');
        this.$emptyState = document.getElementById('empty-state');
        this.$noteEditor = document.getElementById('note-editor');
        this.$sidebar = document.querySelector('.sidebar');
        this.$sidebarToggle = document.getElementById('sidebar-toggle');

        // Sticky Board Elements
        this.$stickyBoardView = document.getElementById('sticky-board-view');
        this.$stickyGrid = document.getElementById('sticky-grid');
        this.$viewToggleBtn = document.getElementById('view-toggle-btn');
        this.$closeBoardBtn = document.getElementById('close-board-btn');
        this.$emptyBoardState = document.getElementById('empty-board-state');

        this.init();
    }

    async init() {
        this.renderView();
        this.addEventListeners();
        if (this.isAuthenticated) {
            await this.fetchNotes();
        }
    }

    async fetchNotes() {
        try {
            const res = await fetch(`${this.baseUrl}/notes`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                this.notes = await res.json();
                this.renderNotesList();
                this.renderStickyBoard();
                if (this.notes.length > 0) {
                    this.setActiveNote(this.notes[0].id);
                } else {
                    this.showEmptyState();
                }
            } else {
                this.logout();
            }
        } catch (err) {
            console.error(err);
        }
    }

    addEventListeners() {
        this.$loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        this.$logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        this.$addNoteBtn.addEventListener('click', () => {
            this.addNote();
        });

        this.$notesList.addEventListener('click', (e) => {
            const noteItem = e.target.closest('.note-list-item');
            if (noteItem) {
                const noteId = parseInt(noteItem.dataset.noteId);
                this.setActiveNote(noteId);
            }
        });

        // View Toggles
        this.$viewToggleBtn.addEventListener('click', () => {
            this.toggleViewMode();
        });

        this.$closeBoardBtn.addEventListener('click', () => {
            this.toggleViewMode(); // Go back to list
        });

        this.$stickyGrid.addEventListener('click', (e) => {
            const stickyNote = e.target.closest('.sticky-note');
            if (stickyNote) {
                const noteId = parseInt(stickyNote.dataset.noteId);
                this.setActiveNote(noteId);
                // Access 'main-content' by hiding sticky board
                this.currentViewMode = 'list';
                this.updateViewVisibility();
            }
        });

        // Auto-save logic
        [this.$noteTitle, this.$noteBody].forEach(input => {
            input.addEventListener('input', () => {
                this.saveActiveNote();
            });
            input.addEventListener('blur', () => {
                this.saveActiveNote(); // Ensure save on blur
            });
        });

        // Simple double click on note item in list to confirm deletion (optional, simplified)
        // Or adding a delete button to each item. For now, let's keep it simple.

        // Mobile Sidebar Toggle
        if (this.$sidebarToggle) {
            this.$sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.$sidebar.classList.toggle('active');
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                this.$sidebar.classList.contains('active') &&
                !this.$sidebar.contains(e.target) &&
                !this.$sidebarToggle.contains(e.target)) {
                this.$sidebar.classList.remove('active');
            }
        });
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            // Try to login first
            let res = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok && res.status === 400) {
                // If login fails, try to register
                res = await fetch(`${this.baseUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
            }

            if (res.ok) {
                const data = await res.json();
                this.token = data.token;
                localStorage.setItem('notes-app-token', this.token);
                this.isAuthenticated = true;
                this.renderView();
                await this.fetchNotes();
            } else {
                alert('Invalid credentials');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.token = null;
        localStorage.removeItem('notes-app-token');
        this.activeNoteId = null;
        this.renderView();
    }

    renderView() {
        if (this.isAuthenticated) {
            this.$loginView.classList.add('hidden');
            this.$dashboardView.classList.remove('hidden');
            this.updateViewVisibility();
        } else {
            this.$loginView.classList.remove('hidden');
            this.$dashboardView.classList.add('hidden');
        }
    }

    toggleViewMode() {
        this.currentViewMode = this.currentViewMode === 'list' ? 'board' : 'list';
        this.updateViewVisibility();
    }

    updateViewVisibility() {
        if (this.currentViewMode === 'board') {
            this.$stickyBoardView.classList.remove('hidden');
            // Update toggle icon to List
            this.$viewToggleBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>`;
            this.$viewToggleBtn.title = "Switch to List View";
        } else {
            this.$stickyBoardView.classList.add('hidden');
            // Update toggle icon to Grid
            this.$viewToggleBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>`;
            this.$viewToggleBtn.title = "Switch to Board View";
        }
    }

    renderNotesList() {
        this.$notesList.innerHTML = '';

        if (this.notes.length === 0) {
            this.$notesList.innerHTML = '<div style="padding: 1rem; color: #999; text-align: center;">No notes yet. Click + to add one.</div>';
            return;
        }

        const sortedNotes = this.notes.sort((a, b) => new Date(b.updated) - new Date(a.updated));

        sortedNotes.forEach(note => {
            const isActive = note.id === this.activeNoteId;
            const title = note.title.trim().length > 0 ? note.title : 'Untitled Note';
            const body = note.body.trim().length > 0 ? note.body : 'No additional text';
            const date = new Date(note.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const noteEl = document.createElement('div');
            noteEl.classList.add('note-list-item');
            if (isActive) noteEl.classList.add('note-list-item--selected');
            noteEl.dataset.noteId = note.id;

            noteEl.innerHTML = `
                <div class="note-small-title">${this.escapeHtml(title)}</div>
                <div class="note-small-body">${this.escapeHtml(body)}</div>
                <div class="note-small-updated">${date}</div>
            `;

            // Add a delete button to the note item for easy deletion
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; border: none; background: transparent; font-size: 1.2rem; cursor: pointer; color: #999; display: none;';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteNote(note.id);
            };

            noteEl.style.position = 'relative';
            noteEl.onmouseenter = () => deleteBtn.style.display = 'block';
            noteEl.onmouseleave = () => deleteBtn.style.display = 'none';
            noteEl.appendChild(deleteBtn);

            this.$notesList.appendChild(noteEl);
        });
    }

    renderStickyBoard() {
        this.$stickyGrid.innerHTML = '';

        if (this.notes.length === 0) {
            this.$emptyBoardState.classList.remove('hidden');
            return;
        } else {
            this.$emptyBoardState.classList.add('hidden');
        }

        const sortedNotes = this.notes.sort((a, b) => new Date(b.updated) - new Date(a.updated));

        sortedNotes.forEach(note => {
            // Assign a random color if not present (persistence optional for now, but helpful)
            if (!note.color) {
                note.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            }

            const title = note.title.trim().length > 0 ? note.title : 'Untitled Note';
            const body = note.body.trim().length > 0 ? note.body : 'No additional text';
            const date = new Date(note.updated).toLocaleDateString([], { month: 'short', day: 'numeric' });

            const noteEl = document.createElement('div');
            noteEl.className = `sticky-note ${note.color}`;
            noteEl.dataset.noteId = note.id;

            // Random slight rotation for organic feel
            const rotation = Math.random() * 4 - 2; // -2 to 2 degrees
            noteEl.style.transform = `rotate(${rotation}deg)`;

            noteEl.innerHTML = `
                <div class="sticky-title">${this.escapeHtml(title)}</div>
                <div class="sticky-body">${this.escapeHtml(body)}</div>
                <div class="sticky-date">${date}</div>
            `;

            this.$stickyGrid.appendChild(noteEl);
        });
    }

    setActiveNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            this.activeNoteId = id;
            this.$noteTitle.value = note.title;
            this.$noteBody.value = note.body;
            this.$noteEditor.classList.remove('hidden');
            this.$emptyState.classList.add('hidden');
            this.renderNotesList(); // Re-render to update selected state
        } else {
            this.showEmptyState();
        }
    }

    showEmptyState() {
        this.activeNoteId = null;
        this.$noteTitle.value = '';
        this.$noteBody.value = '';
        this.$noteEditor.classList.add('hidden');
        this.$emptyState.classList.remove('hidden');
    }

    async addNote() {
        const newNoteData = {
            title: '',
            body: '',
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        };
        
        try {
            const res = await fetch(`${this.baseUrl}/notes`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(newNoteData)
            });

            if (res.ok) {
                const savedNote = await res.json();
                this.notes.unshift(savedNote);
                this.setActiveNote(savedNote.id);

                if (this.currentViewMode === 'board') {
                    this.currentViewMode = 'list';
                    this.updateViewVisibility();
                }

                this.$noteTitle.focus();
                this.renderStickyBoard();
            }
        } catch (err) {
            console.error(err);
        }
    }

    saveActiveNote() {
        if (!this.activeNoteId) return;

        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            // Only fire API update if there is a change
            if (note.title === this.$noteTitle.value && note.body === this.$noteBody.value) return;

            note.title = this.$noteTitle.value;
            note.body = this.$noteBody.value;
            note.updated = new Date().toISOString();
            
            // Re-render quickly for responsiveness
            this.renderNotesList();

            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            
            this.saveTimeout = setTimeout(async () => {
                try {
                    await fetch(`${this.baseUrl}/notes/${note.id}`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.token}`
                        },
                        body: JSON.stringify({ title: note.title, body: note.body, color: note.color })
                    });
                } catch(err) {
                    console.error('Failed to save', err);
                }
            }, 500); // 500ms debounce
        }
    }

    async deleteNote(id) {
        const doDelete = confirm('Are you sure you want to delete this note?');
        if (doDelete) {
            try {
                await fetch(`${this.baseUrl}/notes/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                
                this.notes = this.notes.filter(n => n.id !== id);
                if (this.activeNoteId === id) {
                    this.activeNoteId = null;
                    this.showEmptyState();
                }
                this.renderNotesList();
                this.renderStickyBoard();
                if (this.notes.length === 0) {
                    this.$notesList.innerHTML = '<div style="padding: 1rem; color: #999; text-align: center;">No notes yet. Click + to add one.</div>';
                }
            } catch(err) {
                console.error(err);
            }
        }
    }

    saveNotesToStorage() {
        // Deprecated
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

const app = new App();
