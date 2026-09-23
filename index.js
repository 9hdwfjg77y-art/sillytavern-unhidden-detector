import { getContext } from '../../../extensions.js';

(() => {
    'use strict';

    const PANEL_ID = 'stuh-panel';

    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('details');
    panel.id = PANEL_ID;
    panel.open = true;

    panel.innerHTML = `
        <summary>
            🔎 Не скрыты: <span class="stuh-count">—</span>
        </summary>

        <div class="stuh-content">
            <div class="stuh-navigation">
                <button
                    type="button"
                    class="stuh-prev"
                    title="Предыдущее нескрытое сообщение"
                    aria-label="Предыдущее нескрытое сообщение"
                >←</button>

                <span class="stuh-position">—</span>

                <button
                    type="button"
                    class="stuh-next"
                    title="Следующее нескрытое сообщение"
                    aria-label="Следующее нескрытое сообщение"
                >→</button>
            </div>

            <label class="stuh-label">
                <input type="checkbox" class="stuh-highlight">
                Подсветить нескрытые
            </label>

            <div class="stuh-note" aria-live="polite"></div>
        </div>
    `;

    document.body.append(panel);

    const count = panel.querySelector('.stuh-count');
    const position = panel.querySelector('.stuh-position');
    const note = panel.querySelector('.stuh-note');
    const previous = panel.querySelector('.stuh-prev');
    const next = panel.querySelector('.stuh-next');
    const highlight = panel.querySelector('.stuh-highlight');

    let matches = [];
    let selected = null;

    function isHidden(message) {
        return (
            message.is_system === true ||
            message.is_system === 'true'
        );
    }

    function updatePosition() {
        const index = matches.indexOf(selected);

        position.textContent = index >= 0
            ? `${index + 1} / ${matches.length}`
            : `— / ${matches.length}`;
    }

    function scan() {
        let chat = null;

        try {
            const context = getContext();

            if (Array.isArray(context.chat)) {
                chat = context.chat;
            }
        } catch {
            // Интерфейс может ещё загружаться.
        }

        const elements = [
            ...document.querySelectorAll('#chat .mes[mesid]'),
        ];

        const found = [];

        for (const element of elements) {
            const rawId = element.getAttribute('mesid');
            const id = /^\d+$/.test(rawId ?? '')
                ? Number(rawId)
                : -1;

            const message = chat && id >= 0 ? chat[id] : null;
            const unhidden = Boolean(message && !isHidden(message));

            element.classList.toggle(
                'stuh-unhidden',
                unhidden && highlight.checked,
            );

            if (unhidden) {
                found.push(element);
            }

            if (!unhidden || element !== selected) {
                element.classList.remove('stuh-current');
            }
        }

        matches = found;

        if (selected && !matches.includes(selected)) {
            selected.classList.remove('stuh-current');
            selected = null;
        }

        previous.disabled = matches.length === 0;
        next.disabled = matches.length === 0;

        if (!chat) {
            count.textContent = '—';
            note.textContent = 'Ожидание данных чата…';
            updatePosition();
            return;
        }

        const total = chat.reduce((sum, message) => {
            return sum + (message && !isHidden(message) ? 1 : 0);
        }, 0);

        count.textContent = String(total);

        if (total === 0) {
            note.textContent = chat.length
                ? 'Нескрытых сообщений нет.'
                : 'Открой чат с сообщениями.';
        } else if (total > matches.length) {
            note.textContent =
                `Доступно для перехода: ${matches.length} из ${total}. ` +
                'Для остальных прокрути чат вверх.';
        } else {
            note.textContent = 'Все нескрытые доступны для перехода.';
        }

        updatePosition();
    }

    function jump(direction) {
        scan();

        if (!matches.length) return;

        const currentIndex = matches.indexOf(selected);

        const targetIndex = currentIndex < 0
            ? (direction > 0 ? 0 : matches.length - 1)
            : (
                currentIndex + direction + matches.length
            ) % matches.length;

        if (selected) {
            selected.classList.remove('stuh-current');
        }

        selected = matches[targetIndex];
        selected.classList.add('stuh-current');

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        selected.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'center',
        });

        updatePosition();
    }

    previous.addEventListener('click', () => jump(-1));
    next.addEventListener('click', () => jump(1));
    highlight.addEventListener('change', scan);

    scan();

    // Обновляем счётчик после Hide/Unhide и смены чата.
    // Ничего не записываем в сообщения.
    window.setInterval(() => {
        if (!document.hidden) scan();
    }, 1000);
})();
