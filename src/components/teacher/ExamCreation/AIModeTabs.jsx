import NewUploadFileMode from './AIGenerateFromFile/NewUploadFileMode';
import './AIModeTabs.css';

export default function AIModeTabs() {
    // User requested to remove tabs and keep only the upload file mode
    return (
        <div className="ai-mode-tabs">
            <NewUploadFileMode />
        </div>
    );
}
