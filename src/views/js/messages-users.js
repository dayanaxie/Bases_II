import { requireAuth, getCurrentUser, logout } from './auth.js';

class MessagesManager {
    constructor() {
        this.currentUser = null;
        this.selectedUser = null;
        this.messages = new Map();
        this.init();
    }

    async init() {
        // Verificar autenticación
        if (!requireAuth()) return;
        
        this.currentUser = getCurrentUser();
        
        // Si es admin, redirigir
        if (this.currentUser.tipoUsuario === 'admin') {
            window.location.href = '/datasetsAdmin';
            return;
        }

        this.setupEventListeners();
        await this.loadUsers();
    }

    setupEventListeners() {
        // Navegación
        document.getElementById('back-btn').addEventListener('click', () => {
            window.history.back();
        });

        document.getElementById('datasets-btn').addEventListener('click', () => {
            window.location.href = '/datasetsUser';
        });

        document.getElementById('users-btn').addEventListener('click', () => {
            window.location.href = '/usersUser';
        });

        document.getElementById('profile-btn').addEventListener('click', () => {
            window.location.href = '/profile-user';
        });

        // Chat functionality
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.showUsersList();
        });

        document.getElementById('send-message').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Search functionality
        document.getElementById('search-users').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });
    }

    async loadUsers() {
        const container = document.getElementById('users-container');
        
        try {
            container.innerHTML = '<div class="loading">Cargando usuarios...</div>';
            
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar los usuarios');
            }
            
            const result = await response.json();
            
            if (result.success && result.users) {
                // Filtrar usuarios: excluir administradores y el usuario actual
                const filteredUsers = result.users.filter(user => 
                    user.tipoUsuario !== 'admin' && 
                    user._id !== this.currentUser._id
                );
                
                this.renderUsers(filteredUsers);
            } else {
                throw new Error('Formato de respuesta inválido');
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showErrorMessage('Error al cargar los usuarios. Intenta nuevamente.');
        }
    }

    renderUsers(users) {
        const container = document.getElementById('users-container');
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="no-users">
                    <div class="no-users-icon">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <h3>No hay usuarios disponibles</h3>
                    <p>No se encontraron otros usuarios para chatear</p>
                </div>
            `;
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-item" data-id="${user._id}">
                <div class="user-avatar">
                    ${user.foto && user.foto !== 'null' && user.foto !== 'undefined' ? 
                        `<img src="http://localhost:3000${user.foto}" alt="${user.nombreCompleto}" 
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="avatar-fallback" style="display:none;">
                            <i class="fa-solid fa-user"></i>
                        </div>` : 
                        `<div class="avatar-fallback">
                            <i class="fa-solid fa-user"></i>
                        </div>`
                    }
                </div>
                <div class="user-info">
                    <div class="user-name">${user.nombreCompleto || user.username}</div>
                    <div class="user-username">@${user.username}</div>
                    <div class="user-last-message">${this.getLastMessagePreview(user._id)}</div>
                </div>
                ${this.hasUnreadMessages(user._id) ? '<div class="unread-badge">1</div>' : ''}
            </div>
        `).join('');

        // Add click listeners
        container.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.id;
                const user = users.find(u => u._id === userId);
                this.selectUser(user);
            });
        });
    }

    getLastMessagePreview(userId) {
        const userMessages = this.messages.get(userId);
        if (!userMessages || userMessages.length === 0) {
            return 'No hay mensajes';
        }
        const lastMessage = userMessages[userMessages.length - 1];
        return lastMessage.content.length > 30 
            ? lastMessage.content.substring(0, 30) + '...' 
            : lastMessage.content;
    }

    hasUnreadMessages(userId) {
        const userMessages = this.messages.get(userId);
        if (!userMessages) return false;
        
        const lastMessage = userMessages[userMessages.length - 1];
        return lastMessage && !lastMessage.read && lastMessage.sender !== this.currentUser._id;
    }

    async selectUser(user) {
        this.selectedUser = user;
        this.showChat();
        this.updateChatHeader(user);
        await this.loadMessages(user._id);
    }

    showChat() {
        document.querySelector('.users-list').classList.add('hidden');
        document.getElementById('chat-container').classList.remove('hidden');
        document.getElementById('message-input').focus();
    }

    showUsersList() {
        document.querySelector('.users-list').classList.remove('hidden');
        document.getElementById('chat-container').classList.add('hidden');
        this.selectedUser = null;
    }

    updateChatHeader(user) {
        document.getElementById('chat-user-name').textContent = user.nombreCompleto || user.username;
        const avatar = document.getElementById('chat-user-avatar');
        avatar.innerHTML = '';
        
        if (user.foto) {
            const img = document.createElement('img');
            img.src = `http://localhost:3000${user.foto}`;
            img.alt = user.nombreCompleto || user.username;
            img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            img.onerror = () => {
                avatar.textContent = (user.nombreCompleto || user.username).charAt(0);
            };
            avatar.appendChild(img);
        } else {
            avatar.textContent = (user.nombreCompleto || user.username).charAt(0);
        }
    }

    async loadMessages(otherUserId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/users/messages/conversation/${otherUserId}?currentUserId=${this.currentUser._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();

            if (result.success) {
                this.messages.set(otherUserId, result.messages);
                this.renderMessages(result.messages);
            } else {
                console.error('Error loading messages:', result.message);
                // Para testing, crear mensajes de ejemplo
                this.createMockMessages(otherUserId);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            // Para testing, crear mensajes de ejemplo
            this.createMockMessages(otherUserId);
        }
    }
    createMockMessages(otherUserId) {
        // Mensajes de ejemplo para testing
        const mockMessages = [
            {
                _id: '1',
                content: '¡Hola! ¿Cómo estás?',
                sender: this.currentUser._id,
                receiver: otherUserId,
                timestamp: new Date(Date.now() - 3600000),
                read: true
            },
            {
                _id: '2',
                content: '¡Hola! Estoy bien, gracias. ¿Y tú?',
                sender: otherUserId,
                receiver: this.currentUser._id,
                timestamp: new Date(Date.now() - 1800000),
                read: true
            }
        ];

        this.messages.set(otherUserId, mockMessages);
        this.renderMessages(mockMessages);
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="no-messages">No hay mensajes. ¡Envía el primero!</div>';
            return;
        }

        container.innerHTML = messages.map(message => `
            <div class="message ${message.sender === this.currentUser._id ? 'sent' : 'received'}">
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content || !this.selectedUser) return;

        try {
            const response = await fetch('/api/users/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    sender: this.currentUser._id,
                    receiver: this.selectedUser._id
                })
            });

            const result = await response.json();

            if (result.success) {
                // Add to local storage
                if (!this.messages.has(this.selectedUser._id)) {
                    this.messages.set(this.selectedUser._id, []);
                }
                this.messages.get(this.selectedUser._id).push(result.message);

                // Clear input and re-render
                input.value = '';
                this.renderMessages(this.messages.get(this.selectedUser._id));
            } else {
                // Si falla el envío, agregar localmente para testing
                this.addLocalMessage(content);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // En caso de error, agregar mensaje localmente
            this.addLocalMessage(content);
        }
    }

    addLocalMessage(content) {
        const newMessage = {
            _id: Date.now().toString(),
            content: content,
            sender: this.currentUser._id,
            receiver: this.selectedUser._id,
            timestamp: new Date(),
            read: false
        };

        if (!this.messages.has(this.selectedUser._id)) {
            this.messages.set(this.selectedUser._id, []);
        }
        this.messages.get(this.selectedUser._id).push(newMessage);

        const input = document.getElementById('message-input');
        input.value = '';
        this.renderMessages(this.messages.get(this.selectedUser._id));
    }

    filterUsers(searchTerm) {
        const users = document.querySelectorAll('.user-item');
        const term = searchTerm.toLowerCase();

        users.forEach(user => {
            const userName = user.querySelector('.user-name').textContent.toLowerCase();
            const userUsername = user.querySelector('.user-username').textContent.toLowerCase();
            const show = userName.includes(term) || userUsername.includes(term);
            user.style.display = show ? 'flex' : 'none';
        });
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    showError(message) {
        // Implementación simple de notificación
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--variable-collection-negativo);
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                document.body.removeChild(errorDiv);
            }
        }, 3000);
    }

    showErrorMessage(message) {
        const container = document.getElementById('users-container');
        if (!container) return;

        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                </div>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="location.reload()">Reintentar</button>
            </div>
        `;
    }
}

// Initialize the messages manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MessagesManager();
});