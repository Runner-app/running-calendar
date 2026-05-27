import { state, saveRuns, saveSettings } from './state.js';
import { renderCalendar, updateStats } from './calendar.js';

export function exportBackupToJSON() {
    const backupData = { runs: state.runs, settings: state.settings };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = `bieganie_kopia_${dateStr}.json`;

    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
}

export function importBackupFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (!parsedData.runs && !parsedData.settings) {
                alert('Nieprawidłowy format pliku kopii zapasowej.');
                return;
            }

            if (confirm('Czy na pewno chcesz wczytać tę kopię? Obecne dane w kalendarzu zostaną zastąpione.')) {
                if (parsedData.runs) state.runs = parsedData.runs;
                if (parsedData.settings) state.settings = parsedData.settings;

                saveRuns();
                saveSettings();
                renderCalendar();
                updateStats();
                alert('Kopia zapasowa została pomyślnie wczytana!');
            }
        } catch (err) {
            alert('Wystąpił błąd podczas przetwarzania pliku JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}