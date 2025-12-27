const { useState, useRef, useEffect } = React;

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function App() {
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [search, setSearch] = useState('');
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none' | 'one' | 'all'
  const [queue, setQueue] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => handleNext();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('ended', onEnd);
    };
  }, [current, tracks]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // restore simple settings from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem('music_volume');
      if (v !== null) setVolume(parseFloat(v));
      const s = localStorage.getItem('music_shuffle'); if (s !== null) setShuffle(s === '1');
      const r = localStorage.getItem('music_repeat'); if (r) setRepeat(r);
    } catch (e) {}
  }, []);

  useEffect(() => { try { localStorage.setItem('music_volume', String(volume)); } catch(e){} }, [volume]);
  useEffect(() => { try { localStorage.setItem('music_shuffle', shuffle ? '1' : '0'); } catch(e){} }, [shuffle]);
  useEffect(() => { try { localStorage.setItem('music_repeat', repeat); } catch(e){} }, [repeat]);

  // Auto-load current track when `current` or `tracks` change
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (tracks.length && tracks[current]) {
      a.src = tracks[current].url;
      if (playing) {
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      }
    } else {
      a.removeAttribute('src');
      a.load();
    }
    // reset time
    setTime(0);
  }, [current, tracks]);

  function isAudioFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith && file.type.startsWith('audio')) return true;
    return /\.(mp3|m4a|wav|ogg|flac|aac|webm)$/i.test(file.name || '');
  }

  function addFiles(files) {
    const fileList = Array.from(files).filter(isAudioFile);
    const newTracks = fileList.map((file, i) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      title: file.name,
      artist: '',
      picture: null,
    }));
    setTracks(prev => {
      const prevLen = prev.length;
      const merged = [...prev, ...newTracks];
      newTracks.forEach((t, idx) => {
        try {
          window.jsmediatags.read(t.file, {
            onSuccess: tag => {
              const tags = tag.tags || {};
              const title = tags.title || t.name;
              const artist = tags.artist || '';
              let picture = null;
              if (tags.picture) {
                const { data, format } = tags.picture;
                const byteArray = new Uint8Array(data);
                const blob = new Blob([byteArray], { type: format });
                picture = URL.createObjectURL(blob);
              }
              setTracks(cur => cur.map(ct => ct.id === t.id ? { ...ct, title, artist, picture } : ct));
            },
            onError: () => {}
          });
        } catch (e) {}
      });
      // if no tracks previously, set current to first added
      if (prevLen === 0 && newTracks.length) {
        setTimeout(() => setCurrent(0), 0);
      }
      return merged;
    });
  }

  function handlePlay() {
    if (!tracks.length) return;
    const audio = audioRef.current;
    audio.src = tracks[current].url;
    audio.play();
    setPlaying(true);
  }

  function handlePause() {
    audioRef.current.pause();
    setPlaying(false);
  }

  function handleNext() {
    // If queue has items, play the next queued track
    setQueue(q => {
      if (q.length > 0) {
        const [nextId, ...rest] = q;
        const nextIndex = tracks.findIndex(t => t.id === nextId);
        if (nextIndex >= 0) {
          setCurrent(nextIndex);
          setTimeout(() => {
            const a = audioRef.current;
            a.src = tracks[nextIndex].url;
            if (playing) a.play();
          }, 0);
        }
        return rest;
      }
      // otherwise follow shuffle/repeat rules
      setCurrent(i => {
        if (shuffle && tracks.length > 1) {
          let rnd;
          do { rnd = Math.floor(Math.random() * tracks.length); } while (rnd === i && tracks.length > 1);
          const next = rnd;
          setTimeout(() => {
            const a = audioRef.current; a.src = tracks[next].url; if (playing) a.play();
          }, 0);
          return next;
        }
        // normal advance
        const atEnd = i >= tracks.length - 1;
        if (atEnd) {
          if (repeat === 'all') {
            const next = 0;
            setTimeout(() => { const a = audioRef.current; a.src = tracks[next].url; if (playing) a.play(); }, 0);
            return next;
          }
          if (repeat === 'one') {
            // replay same
            setTimeout(() => { const a = audioRef.current; a.src = tracks[i].url; if (playing) a.play(); }, 0);
            return i;
          }
          // stop
          setPlaying(false);
          return i;
        }
        const next = i + 1;
        setTimeout(() => { const a = audioRef.current; a.src = tracks[next].url; if (playing) a.play(); }, 0);
        return next;
      });
      return [];
    });
  }

  function handlePrev() {
    setCurrent(i => {
      if (shuffle && tracks.length > 1) {
        let rnd;
        do { rnd = Math.floor(Math.random() * tracks.length); } while (rnd === i && tracks.length > 1);
        const prev = rnd;
        setTimeout(() => { const a = audioRef.current; a.src = tracks[prev].url; if (playing) a.play(); }, 0);
        return prev;
      }
      const prev = (i - 1 + tracks.length) % tracks.length;
      setTimeout(() => { const a = audioRef.current; a.src = tracks[prev].url; if (playing) a.play(); }, 0);
      return prev;
    });
  }

  function seekTo(pct) {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = (pct / 100) * duration;
  }

  function handleSelect(index) {
    setCurrent(index);
    setTimeout(() => {
      const a = audioRef.current;
      a.src = tracks[index].url;
      a.play();
      setPlaying(true);
    }, 0);
  }

  function enqueueTrack(id) {
    setQueue(q => [...q, id]);
  }

  function removeFromQueue(id) {
    setQueue(q => q.filter(x => x !== id));
  }

  function clearQueue() { setQueue([]); }

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? handlePause() : handlePlay(); }
      if (e.code === 'ArrowRight') handleNext();
      if (e.code === 'ArrowLeft') handlePrev();
      if (e.key === 's') setShuffle(v => !v);
      if (e.key === 'r') setRepeat(r => r === 'none' ? 'one' : r === 'one' ? 'all' : 'none');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, tracks]);

  const currentTrack = tracks[current];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">Mukera</div>
        <div className="file-chooser">
          <label className="btn">
            Add Audio
            <input type="file" multiple accept="audio/*" webkitdirectory="" directory="" onChange={e => addFiles(e.target.files)} />
          </label>
        </div>

        <div className="search">
          <input placeholder="Search tracks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="playlist">
          {tracks.length === 0 ? <div className="empty">No tracks — add some audio files</div> : (
            <ul>
              {tracks.filter(t => (t.title + ' ' + t.artist).toLowerCase().includes(search.toLowerCase())).map((t, i) => (
                <li key={t.id} className={i === current ? 'active' : ''} onClick={() => handleSelect(i)}>
                  <div className="meta">
                    <div className="title">{t.title}</div>
                    <div className="artist">{t.artist}</div>
                  </div>
                  <div className="actions">
                    <button className="small" onClick={(e) => { e.stopPropagation(); enqueueTrack(t.id); }}>➕</button>
                    <div className="dur">{t.name.split('.').pop()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {queue.length > 0 && (
            <div className="queue-area">
              <div className="queue-header">Queue <span className="queue-badge">{queue.length}</span> <button className="small" onClick={clearQueue}>Clear</button></div>
              <ul className="queue-list">
                {queue.map((id, idx) => {
                  const t = tracks.find(x => x.id === id);
                  if (!t) return null;
                  return (
                    <li key={id} onClick={() => { const i = tracks.findIndex(x => x.id === id); if (i >= 0) handleSelect(i); }}>
                      <div className="qmeta">{t.title}</div>
                      <div className="qactions"><button className="small" onClick={(e) => { e.stopPropagation(); removeFromQueue(id); }}>✖</button></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <main className="player-main">
        <div className="now">
          <div className="cover">
            {currentTrack && currentTrack.picture ? <img src={currentTrack.picture} alt="cover" /> : <div className="placeholder">♪</div>}
          </div>
          <div className="info">
            <div className="title">{currentTrack ? currentTrack.title : 'Nothing loaded'}</div>
            <div className="artist">{currentTrack ? currentTrack.artist : ''}</div>
          </div>
        </div>
          <audio ref={audioRef} preload="metadata" />
      </main>

        <div className="player" role="region" aria-label="Player controls">
          <div className="left-controls">
            <button className={`toggle ${shuffle ? 'active' : ''}`} onClick={() => setShuffle(s => !s)} title="Shuffle">🔀</button>
            <button className="big" onClick={handlePrev} aria-label="Previous">⏮</button>
              <button className={`play big ${playing ? 'playing' : ''}`} onClick={playing ? handlePause : handlePlay} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? '⏸' : '▶'}
              </button>
            <button className="big" onClick={handleNext} aria-label="Next">⏭</button>
            <button className={`toggle ${repeat !== 'none' ? 'active' : ''}`} onClick={() => setRepeat(r => r === 'none' ? 'one' : r === 'one' ? 'all' : 'none')} title="Repeat">{repeat === 'one' ? '🔂' : '🔁'}</button>
          </div>

          <div className="center-progress">
            <span className="time">{formatTime(time)}</span>
            <input className="seek" type="range" min="0" max="100" value={duration ? (time / duration) * 100 : 0} onChange={e => seekTo(e.target.value)} aria-label="Seek" />
            <span className="time">{formatTime(duration)}</span>
          </div>

          <div className="right-volume">
            <button className="volume-icon">🔊</button>
            <input className="vol-range" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} aria-label="Volume" />
          </div>
        </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
