(function(){
        const fileInput = document.getElementById('file-input');
        const openFolderBtn = document.getElementById('open-folder');
        const playlistPanel = document.getElementById('playlist-panel');
        const trackList = document.getElementById('track-list');
        const audio = document.getElementById('audio');
        const playBtn = document.getElementById('play');
        const pauseBtn = document.getElementById('pause');
        const prevBtn = document.getElementById('prev');
        const nextBtn = document.getElementById('next');
        const seek = document.getElementById('seek');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');
        const volume = document.getElementById('volume');
        const nowPlaying = document.getElementById('now-playing');
        const coverDiv = document.querySelector('.cover');

        const tracks = [];
        let currentIndex = -1;

        // restore volume from localStorage
        try { 
            const v = localStorage.getItem('musicVolume'); if (v !== null)
                 { 
                    volume.value = v;
                     audio.volume = parseFloat(v); 
                } 
        } catch(e){}

        function formatTime(sec){
            if (isNaN(sec)) return '0:00';
            const s = Math.floor(sec % 60).toString().padStart(2,'0');
            const m = Math.floor(sec / 60);
            return m + ':' + s;
        }

        function isAudioFile(file){
            if (!file) return false;
            if (file.type && file.type.startsWith && file.type.startsWith('audio')) return true;
            return /\.(mp3|m4a|wav|ogg|flac|aac|webm)$/i.test(file.name || '');
        }

        function setCover(dataUrl){
            if (!coverDiv) return;
            if (dataUrl){
                coverDiv.style.backgroundImage = `url('${dataUrl}')`;
                coverDiv.style.backgroundSize = 'cover';
                coverDiv.style.backgroundPosition = 'center';
            } else {
                coverDiv.style.backgroundImage = '';
            }
        }

        function renderTracks(){
            trackList.innerHTML = '';
            tracks.forEach((t, i) => {
                const li = document.createElement('li');
                li.textContent = t.name;
                li.tabIndex = 0;
                li.setAttribute('role','option');
                li.dataset.index = i;
                li.className = i === currentIndex ? 'active' : '';
                li.addEventListener('click', () => playIndex(i));
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playIndex(i); }
                });
                trackList.appendChild(li);
            });
        }

        function updateNowPlaying(){
            nowPlaying.textContent = currentIndex >=0 && tracks[currentIndex] ? ('Now playing: ' + tracks[currentIndex].name) : 'No track loaded';
            try { localStorage.setItem('musicLastIndex', currentIndex); } catch(e){}
        }

        function playIndex(i){
            if (i < 0 || i >= tracks.length) return;
            currentIndex = i;
            audio.src = tracks[i].url;
            const p = audio.play();
            if (p && p.catch){
                p.catch(err => {
                    console.warn('Playback failed:', err);
                    nowPlaying.textContent = 'Playback error: ' + (err && err.message ? err.message : 'unable to play');
                });
            }
            updatePlayState(true);
            renderTracks();
            updateNowPlaying();
            setCover(tracks[i].art || null);
        }

        function updatePlayState(isPlaying){
            playBtn.hidden = isPlaying;
            pauseBtn.hidden = !isPlaying;
        }

        function readTags(file, idx){
            if (!window.jsmediatags) return;
            try {
                window.jsmediatags.read(file, {
                    onSuccess: function(tag){
                        if (tag.tags && tag.tags.picture){
                            const pic = tag.tags.picture;
                            const data = pic.data;
                            let base64String = '';
                            for (let i = 0; i < data.length; i++){
                                base64String += String.fromCharCode(data[i]);
                            }
                            const b64 = btoa(base64String);
                            const dataUrl = `data:${pic.format};base64,${b64}`;
                            tracks[idx].art = dataUrl;
                            if (idx === currentIndex) setCover(dataUrl);
                        }
                    },
                    onError: function(err){ /* ignore tag read errors */ }
                });
            } catch(e) { /* fail silently */ }
        }

        function addFiles(fileList){
            const files = Array.from(fileList).filter(isAudioFile);
            files.forEach((f) => {
                const url = URL.createObjectURL(f);
                const idx = tracks.push({ name: f.name, url, art: null }) - 1;
                readTags(f, idx);
            });
            if (currentIndex === -1 && tracks.length) playIndex(0);
            renderTracks();
        }

        fileInput.addEventListener('change', (e) => addFiles(e.target.files));

        // Drag & drop
        playlistPanel.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
            playlistPanel.classList.add('dragover');
         });
        playlistPanel.addEventListener('dragleave', (e) => {
             playlistPanel.classList.remove('dragover'); 
            });
        playlistPanel.addEventListener('drop', (e) => {
            e.preventDefault(); 
            playlistPanel.classList.remove('dragover');
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length) addFiles(dt.files);
        });

        // Optional: File System Access API to open directories (Chrome-based browsers)
        if (window.showDirectoryPicker) {
            openFolderBtn.addEventListener('click', async () => {
                try {
                    const dir = await window.showDirectoryPicker();
                    await traverseDirectory(dir);
                    if (currentIndex === -1 && tracks.length) playIndex(0);
                    renderTracks();
                } catch (err) {
                    console.warn('Folder access cancelled or failed', err);
                }
            });
        } else {
            // Hide the button on browsers that don't support directory picker
            openFolderBtn.style.display = 'none';
        }

        async function traverseDirectory(dirHandle){
            for await (const entry of dirHandle.values()){
                if (entry.kind === 'file'){
                    const f = await entry.getFile();
                    if (isAudioFile(f)){
                        const url = URL.createObjectURL(f);
                        const idx = tracks.push({ name: f.name, url, art: null }) - 1;
                        readTags(f, idx);
                    }
                } else if (entry.kind === 'directory'){
                    // traverse recursively
                    await traverseDirectory(entry);
                }
            }
        }

        playBtn.addEventListener('click', () => { const p = audio.play(); 
            if (p && p.catch) p.catch(err => { 
                console.warn('Play error', err); 
                nowPlaying.textContent = 'Playback error'; 
            }); 
            updatePlayState(true); 
        });
        pauseBtn.addEventListener('click', () => { 
            audio.pause(); 
            updatePlayState(false); 
        });
        prevBtn.addEventListener('click', () => { 
            if (currentIndex > 0) 
                playIndex(currentIndex - 1); 
        });
        nextBtn.addEventListener('click', () => { 
            if (currentIndex < tracks.length - 1) 
                playIndex(currentIndex + 1); 
        });

        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const pct = (audio.currentTime / audio.duration) * 100;
                seek.value = pct;
                currentTimeEl.textContent = formatTime(audio.currentTime);
                durationEl.textContent = formatTime(audio.duration);
            }
        });

        audio.addEventListener('ended', () => {
            if (currentIndex < tracks.length - 1) playIndex(currentIndex + 1);
            else updatePlayState(false);
        });

        seek.addEventListener('input', () => {
            if (!audio.duration) return;
            const t = (seek.value / 100) * audio.duration;
            audio.currentTime = t;
        });

        volume.addEventListener('input', () => { audio.volume = parseFloat(volume.value); 
            try { localStorage.setItem('musicVolume', volume.value); } catch(e){} 
        });

        // Restore last-index if possible (only meaningful if files still present in session)
        try { const li = parseInt(localStorage.getItem('musicLastIndex')); if (!isNaN(li)) currentIndex = li; } catch(e){}

        // Basic keyboard navigation for the list
        trackList.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); 
                const next = Math.min(tracks.length - 1, (currentIndex === -1 ? 0 : currentIndex + 1)); if (next >= 0) { 
                    const item = trackList.querySelector('[data-index="'+next+'"]'); 
                    if(item) item.focus(); 
                } 
            }
            if (e.key === 'ArrowUp') { e.preventDefault(); 
                const prev = Math.max(0, (currentIndex === -1 ? 0 : currentIndex - 1)); 
                if (prev >= 0) { 
                    const item = trackList.querySelector('[data-index="'+prev+'"]'); 
                    if(item) item.focus(); 
                } 
            }
        });

    })();