(function() {
    const ROW_HEIGHT = 25;
    let draggingCard = null;
    let cloneCard = null;
    
    // Original state tracking
    let fromStaff = "";
    let fromTimeRange = "";
    let initialCol = null;
    let initialTop = 0;

    // 1. Setup Styles
    const existing = document.getElementById('cal-drag-realtime-styles');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'cal-drag-realtime-styles';
    style.innerHTML = `
        .is-original-placeholder { opacity: 0.3 !important; pointer-events: none !important; }
        .is-moving-active { z-index: 9999 !important; cursor: grabbing !important; opacity: 1 !important; box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
        .dragging-now .cal-hover-slot { display: none !important; }

        .cal-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.4); display: flex; align-items: center;
            justify-content: center; z-index: 10000; font-family: -apple-system, sans-serif;
        }
        .cal-popup {
            background: white; padding: 28px; border-radius: 16px; width: 420px;
        }
        .cal-popup h3 { margin: 0 0 20px 0; font-size: 20px; color: #111; }
        .cal-data-label { font-size: 12px; color: #777; margin-bottom: 4px; text-transform: uppercase; }
        .cal-data-value { font-size: 15px; color: #111; margin-bottom: 12px; }
        .cal-popup-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 28px; }
        .btn-cancel { background: none; border: none; cursor: pointer; color: #666; }
        .btn-confirm { background: #000; color: #fff; border: none; padding: 10px 24px; border-radius: 24px; cursor: pointer; font-weight: 600; }
    `;
    document.head.appendChild(style);

    const formatTime = (y) => {
        const totalMins = (y / 25) * 15;
        let hours = Math.floor(totalMins / 60) + 10; 
        const mins = Math.floor(totalMins % 60);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHours}:${mins.toString().padStart(2, '0')} ${suffix}`;
    };

    const showPopup = (card, finalCol, finalTop) => {
        const toStaff = finalCol.getAttribute('data-staff-name');
        const durationPx = parseInt(card.style.height);
        const toTimeRange = `${formatTime(finalTop)} - ${formatTime(finalTop + durationPx)}`;

        const overlay = document.createElement('div');
        overlay.className = 'cal-popup-overlay';
        overlay.innerHTML = `
            <div class="cal-popup">
                <h3>Update this appointment?</h3>
                <div class="cal-data-label">From</div>
                <div class="cal-data-value">${fromStaff} • ${fromTimeRange}</div>
                <div class="cal-data-label">To</div>
                <div class="cal-data-value"><strong>${toStaff} • ${toTimeRange}</strong></div>
                <div class="cal-popup-actions">
                    <button class="btn-cancel">No, keep as is</button>
                    <button class="btn-confirm">Yes, update</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.btn-cancel').onclick = () => {
            initialCol.appendChild(card);
            card.style.top = `${initialTop}px`;
            const timeLabel = card.querySelector('.cal-booking-time');
            if (timeLabel) timeLabel.innerText = fromTimeRange;
            overlay.remove();
        };

        overlay.querySelector('.btn-confirm').onclick = () => overlay.remove();
    };

    // Events
    window.addEventListener('mousemove', (e) => {
        if (draggingCard) {
            e.stopImmediatePropagation();
            const els = document.elementsFromPoint(e.clientX, e.clientY);
            const col = els.find(el => el.classList.contains('cal-staff-column'));
            
            if (col) {
                const rect = col.getBoundingClientRect();
                const snappedY = Math.floor((e.clientY - rect.top) / ROW_HEIGHT) * ROW_HEIGHT;
                
                // Update Position
                draggingCard.style.top = `${snappedY}px`;
                if (draggingCard.parentNode !== col) col.appendChild(draggingCard);

                // REAL-TIME TIME UPDATE
                const timeLabel = draggingCard.querySelector('.cal-booking-time');
                if (timeLabel) {
                    const durationPx = parseInt(draggingCard.style.height);
                    timeLabel.innerText = `${formatTime(snappedY)} - ${formatTime(snappedY + durationPx)}`;
                }
            }
        }
    }, true);

    document.addEventListener('mousedown', (e) => {
        const card = e.target.closest('.cal-booking-card');
        if (!card || card.classList.contains('is-original-placeholder')) return;

        draggingCard = card;
        initialCol = card.parentNode;
        initialTop = parseInt(card.style.top);
        
        fromStaff = initialCol.getAttribute('data-staff-name');
        fromTimeRange = card.querySelector('.cal-booking-time')?.innerText || formatTime(initialTop);

        document.body.classList.add('dragging-now');
        cloneCard = card.cloneNode(true);
        cloneCard.classList.add('is-original-placeholder');
        card.parentNode.insertBefore(cloneCard, card);
        card.classList.add('is-moving-active');
        e.preventDefault(); 
    });

    document.addEventListener('mouseup', () => {
        if (!draggingCard) return;
        const finalCol = draggingCard.parentNode;
        const finalTop = parseInt(draggingCard.style.top);

        document.body.classList.remove('dragging-now');
        if (cloneCard) cloneCard.remove();
        draggingCard.classList.remove('is-moving-active');
        
        if (finalCol !== initialCol || finalTop !== initialTop) {
            showPopup(draggingCard, finalCol, finalTop);
        }
        draggingCard = null;
    });
})();