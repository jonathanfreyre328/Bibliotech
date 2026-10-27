const Navigation = (function() {
    const tabConfigs = {
        student: [
            { id: 'materials', label: 'Mis Materiales', icon: '📄' },
            { id: 'requests', label: 'Solicitudes', icon: '📋' },
            { id: 'profile', label: 'Perfil', icon: '👤' }
        ],
        professor: [
            { id: 'materials', label: 'Mis Materiales', icon: '📄' },
            { id: 'requests', label: 'Solicitudes', icon: '📋' },
            { id: 'students', label: 'Mis Alumnos', icon: '👥' },
            { id: 'my-classes', label: 'Mis Clases', icon: '🏫' },
            { id: 'profile', label: 'Perfil', icon: '👤' }
        ],
        admin: [
            { id: 'users', label: 'Usuarios', icon: '👥' },
            { id: 'professors', label: 'Profesores', icon: '👨‍🏫' },
            { id: 'careers', label: 'Carreras', icon: '🎓' },
            { id: 'subjects', label: 'Materias', icon: '📚' },
            { id: 'classes', label: 'Clases', icon: '🏫' },
            { id: 'profile', label: 'Perfil', icon: '👤' }
        ]
    };

    function createElement(tag, className, attributes = {}) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'dataset') {
                Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
            } else {
                el.setAttribute(key, value);
            }
        });
        return el;
    }

    function renderNavBar(role, activeTab, onTabChange) {
        const existingNav = document.querySelector('.role-navbar');
        if (existingNav) existingNav.remove();

        const tabs = tabConfigs[role] || [];

        const nav = createElement('nav', 'w3-bar w3-black w3-border-bottom role-navbar', { role: 'navigation' });

        const brand = createElement('span', 'w3-bar-item w3-text-yellow', { style: 'font-weight: bold;' });
        brand.textContent = 'BIBLIOTECH';
        nav.appendChild(brand);

        tabs.forEach(tab => {
            const btn = createElement('button', 'w3-bar-item w3-button', {
                'data-tab': tab.id,
                role: 'tab',
                'aria-selected': tab.id === activeTab ? 'true' : 'false'
            });
            // Icono y etiqueta se insertan como nodos de texto (sin innerHTML).
            const iconSpan = createElement('span');
            iconSpan.textContent = tab.icon;
            const labelSpan = createElement('span');
            labelSpan.textContent = tab.label;
            btn.appendChild(iconSpan);
            btn.appendChild(document.createTextNode(' '));
            btn.appendChild(labelSpan);
            if (tab.id === activeTab) {
                btn.classList.add('w3-yellow');
            }
            btn.addEventListener('click', () => {
                if (onTabChange) onTabChange(tab.id);
                switchTab(tab.id);
            });
            nav.appendChild(btn);
        });

        const spacer = createElement('div', 'w3-bar-item');
        spacer.style.flexGrow = '1';
        nav.appendChild(spacer);

        const logoutBtn = createElement('button', 'w3-bar-item w3-button w3-right btn-logout');
        logoutBtn.textContent = 'Salir';
        logoutBtn.addEventListener('click', () => authHelper.logout());
        nav.appendChild(logoutBtn);

        const header = document.querySelector('header') || document.body.firstElementChild;
        if (header && header.classList.contains('w3-bar')) {
            header.replaceWith(nav);
        } else {
            document.body.insertBefore(nav, document.body.firstChild);
        }

        return nav;
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        const activeTab = document.getElementById(`tab-${tabId}`);
        if (activeTab) {
            activeTab.style.display = 'block';
            activeTab.classList.add('active');
        }

        document.querySelectorAll('.role-navbar [data-tab]').forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('w3-yellow');
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.classList.remove('w3-yellow');
                btn.setAttribute('aria-selected', 'false');
            }
        });
    }

    return {
        renderNavBar
    };
})();