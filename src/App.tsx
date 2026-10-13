/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import {
  Volume2,
  ChevronDown,
  Play,
  Lock,
  KeyRound,
  Save,
  RotateCcw,
  LogOut,
  Eye,
  Settings,
  CheckCircle2,
  AlertCircle,
  Video,
  Layers,
  ArrowLeft,
  VolumeX,
} from 'lucide-react';

interface AppConfig {
  videoId: string;
  ad1ScriptUrl: string;
  ad2ScriptUrl: string;
  ad2ContainerId: string;
  topBannerCount: number;
  bottomBannerCount: number;
  autoScroll: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  videoId: '1235125945',
  ad1ScriptUrl: 'https://bauval.org/14/d5971812e8228bafc23fefa5e2dcedb5',
  ad2ScriptUrl: 'https://bauval.org/21/3359dfb49d3904ef22e968fbd601bd0f',
  ad2ContainerId: 'container-3359dfb49d3904ef22e968fbd601bd0f',
  topBannerCount: 10,
  bottomBannerCount: 5,
  autoScroll: true,
};

// 300x250 Banner Component with Isolated Execution Context
function AdBanner300x250({
  index,
  scriptUrl,
  containerId,
}: {
  index: number;
  scriptUrl: string;
  containerId: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !scriptUrl) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 300px;
      height: 250px;
      overflow: hidden;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="${containerId}"></div>
  <script async="async" data-cfasync="false" src="${scriptUrl}"></script>
</body>
</html>`);
      doc.close();
    } catch (err) {
      console.error(`Error loading ad in slot ${index}:`, err);
    }
  }, [index, scriptUrl, containerId]);

  return (
    <div className="w-[300px] h-[250px] bg-slate-50 border border-slate-200/90 rounded-xl overflow-hidden shadow-xs shrink-0 mx-auto flex items-center justify-center">
      <iframe
        ref={iframeRef}
        title={`300x250 Banner Slot ${index}`}
        className="w-[300px] h-[250px] border-0 block"
        scrolling="no"
      />
    </div>
  );
}

export default function App() {
  // Navigation detection for /admin route
  const [isAdminPath, setIsAdminPath] = useState<boolean>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path === '/admin' || path.startsWith('/admin') || hash === '#/admin';
  });

  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('wc_admin_session') === 'active';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Application configuration state
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('white_cinema_config');
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_CONFIG;
  });

  // Form edit state inside admin panel
  const [formConfig, setFormConfig] = useState<AppConfig>(config);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Video references and audio state
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Sync route on popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      setIsAdminPath(path === '/admin' || path.startsWith('/admin') || hash === '#/admin');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Fetch persisted config from server on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.videoId) {
          setConfig((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
            return { ...prev, ...data };
          });
          setFormConfig((prev) => ({ ...prev, ...data }));
          localStorage.setItem('white_cinema_config', JSON.stringify(data));
        }
      })
      .catch(() => {
        // Fall back to localStorage / defaults silently
      });
  }, []);

  // Inject Popunder script (Ad 1) dynamically into head (only once)
  useEffect(() => {
    if (!config.ad1ScriptUrl) return;
    const existing = document.getElementById('ad1-dynamic-script');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = 'ad1-dynamic-script';
    script.setAttribute('data-cfasync', 'false');
    script.src = config.ad1ScriptUrl;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [config.ad1ScriptUrl]);

  // Connect Official Vimeo Player SDK
  useEffect(() => {
    if (isAdminPath || !iframeRef.current) return;

    try {
      const player = new Player(iframeRef.current);
      vimeoPlayerRef.current = player;

      player.ready().then(() => {
        // Force unmuting via SDK
        player.setMuted(false).then(() => {
          player.setVolume(1);
          setSoundEnabled(true);
        }).catch(() => {
          // If browser policy holds, it will unmute on first gesture
        });
      });

      player.on('play', () => {
        player.setMuted(false).catch(() => {});
        player.setVolume(1).catch(() => {});
      });

      return () => {
        player.destroy().catch(() => {});
        vimeoPlayerRef.current = null;
      };
    } catch (err) {
      console.error('Vimeo player SDK init error:', err);
    }
  }, [config.videoId, isAdminPath]);

  // Robust Auto Sound Trigger using Vimeo Player SDK
  const triggerAutoSound = () => {
    if (vimeoPlayerRef.current) {
      vimeoPlayerRef.current
        .setMuted(false)
        .then(() => {
          vimeoPlayerRef.current?.setVolume(1);
          setSoundEnabled(true);
        })
        .catch((err) => {
          console.warn('Vimeo unmute attempt:', err);
        });
    }

    // Fallback postMessage
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage('{"method":"setMuted","value":false}', '*');
        iframeRef.current.contentWindow.postMessage('{"method":"setVolume","value":1}', '*');
      } catch (e) {
        console.error(e);
      }
    }
    setSoundEnabled(true);
  };

  // Gentle, slow auto-scrolling function to let user view top ads as it scrolls
  const slowScrollToVideo = (duration = 4500) => {
    if (!videoSectionRef.current) return;

    const startY = window.pageYOffset;
    const targetRect = videoSectionRef.current.getBoundingClientRect();
    const targetY = startY + targetRect.top - Math.max(20, (window.innerHeight - targetRect.height) / 2);
    const distance = targetY - startY;

    if (Math.abs(distance) < 20) return;

    const startTime = performance.now();
    let isCancelled = false;

    const cancelScroll = () => {
      isCancelled = true;
      window.removeEventListener('wheel', cancelScroll);
      window.removeEventListener('touchstart', cancelScroll);
    };

    window.addEventListener('wheel', cancelScroll, { passive: true });
    window.addEventListener('touchstart', cancelScroll, { passive: true });

    // Smooth easeInOut curve for leisurely, natural reading speed
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const step = (currentTime: number) => {
      if (isCancelled) return;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        cancelScroll();
        triggerAutoSound();
      }
    };

    requestAnimationFrame(step);
  };

  // Immediate smooth scroll for button click
  const scrollToVideo = (behavior: ScrollBehavior = 'smooth') => {
    if (videoSectionRef.current) {
      videoSectionRef.current.scrollIntoView({
        behavior,
        block: 'center',
      });
    }
    triggerAutoSound();
  };

  // Start slow gentle scroll after 1.2 seconds so user sees top ads comfortably
  useEffect(() => {
    if (isAdminPath || !config.autoScroll) return;

    const scrollTimer = setTimeout(() => {
      slowScrollToVideo(5000); // 5 seconds leisurely glide down
    }, 1200);

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [isAdminPath, config.autoScroll]);

  // Global user gesture listener: touching, clicking or scrolling anywhere un-mutes audio
  useEffect(() => {
    if (isAdminPath) return;

    const handleFirstGesture = () => {
      triggerAutoSound();
    };

    window.addEventListener('touchstart', handleFirstGesture, { capture: true, passive: true });
    window.addEventListener('touchend', handleFirstGesture, { capture: true, passive: true });
    window.addEventListener('pointerdown', handleFirstGesture, { capture: true, passive: true });
    window.addEventListener('click', handleFirstGesture, { capture: true, passive: true });
    window.addEventListener('scroll', handleFirstGesture, { capture: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { capture: true, passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('touchend', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('scroll', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [isAdminPath]);

  // Handle Admin Login submission
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (passwordInput === '445566') {
      sessionStorage.setItem('wc_admin_session', 'active');
      setIsAuthenticated(true);
      setPasswordInput('');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('wc_admin_session', 'active');
        setIsAuthenticated(true);
        setPasswordInput('');
        return;
      }
    } catch {
      // ignore
    }

    setLoginError('ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।');
  };

  // Handle Admin Logout
  const handleAdminLogout = () => {
    sessionStorage.removeItem('wc_admin_session');
    setIsAuthenticated(false);
  };

  // Return to public page
  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setIsAdminPath(false);
  };

  // Handle Admin Config Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleanVideoId = formConfig.videoId.trim();
    const match = cleanVideoId.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+))|(^\d+$)/);
    if (match) {
      cleanVideoId = match[1] || match[2];
    }

    const updated: AppConfig = {
      ...formConfig,
      videoId: cleanVideoId,
    };

    setConfig(updated);
    setFormConfig(updated);
    localStorage.setItem('white_cinema_config', JSON.stringify(updated));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Could not persist to server, saved locally:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reset to original default configuration
  const handleResetToDefault = () => {
    if (window.confirm('আপনি কি ডিফল্ট সেটিংসে ফিরে যেতে চান?')) {
      setConfig(DEFAULT_CONFIG);
      setFormConfig(DEFAULT_CONFIG);
      localStorage.setItem('white_cinema_config', JSON.stringify(DEFAULT_CONFIG));
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_CONFIG),
      }).catch(() => {});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // ==========================================
  // VIEW 1: ADMIN LOGIN SCREEN (/admin unauthenticated)
  // ==========================================
  if (isAdminPath && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mb-3 text-slate-200">
              <Lock className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">এডমিন প্যানেল লগইন</h1>
            <p className="text-xs text-slate-400 mt-1">
              প্রবেশ করতে সিকিউরিটি পাসওয়ার্ড প্রদান করুন
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন..."
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
              {loginError && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-md"
            >
              লগইন করুন
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
            <button
              onClick={navigateToHome}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ওয়েবসাইটে ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ADMIN DASHBOARD (/admin authenticated)
  // ==========================================
  if (isAdminPath && isAuthenticated) {
    const previewEmbedUrl = `https://player.vimeo.com/video/${formConfig.videoId}?autoplay=0&badge=0&autopause=1`;

    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-100 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Admin Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <span>কন্ট্রোল ও এডমিন প্যানেল</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ভিডিও পরিবর্তন, এডিটিং এবং অ্যাডস স্ক্রিপ্ট কোড নিয়ন্ত্রণ করুন
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={navigateToHome}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>লাইভ সাইট দেখুন</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="px-3.5 py-2 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-800/60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            </div>
          </header>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3.5 bg-emerald-900/60 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>কনফিগারেশন সফলভাবে আপডেট ও সেভ হয়েছে!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* Section 1: Video Management */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                <Video className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">১. ভিডিও পরিবর্তন ও এডিটিং</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Vimeo ভিডিও আইডি বা লিংক:
                    </label>
                    <input
                      type="text"
                      value={formConfig.videoId}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, videoId: e.target.value })
                      }
                      placeholder="যেমন: 1235125945 অথবা https://vimeo.com/1235125945"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      আপনি সম্পূর্ণ Vimeo লিংক পেস্ট করলেও সিস্টেম স্বয়ংক্রিয়ভাবে আইডি শনাক্ত করবে।
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={formConfig.autoScroll}
                        onChange={(e) =>
                          setFormConfig({ ...formConfig, autoScroll: e.target.checked })
                        }
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>পেজে ঢুকলে স্বয়ংক্রিয় স্ক্রোলিং (Auto-scroll to Video)</span>
                    </label>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    লাইভ প্রিভিউ (মিউট অবস্থায়):
                  </label>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-700">
                    <iframe
                      src={previewEmbedUrl}
                      className="w-full h-full border-0"
                      allow="fullscreen"
                      title="Admin Video Preview"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Ad Codes Management */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">২. বিজ্ঞাপন স্ক্রিপ্ট কোড পরিবর্তন</h2>
              </div>

              <div className="space-y-5">
                {/* Ad 1: Popunder / Global Script */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    অ্যাড ১: পপ-আন্ডার / ডিরেক্ট স্ক্রিপ্ট সোর্স URL (Global Script)
                  </label>
                  <input
                    type="text"
                    value={formConfig.ad1ScriptUrl}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, ad1ScriptUrl: e.target.value })
                    }
                    placeholder="https://bauval.org/14/..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    বর্তমান কোড: <code className="text-slate-300">{config.ad1ScriptUrl}</code>
                  </p>
                </div>

                {/* Ad 2: Banner Script URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      অ্যাড ২: ৩০০×২৫০ ব্যানার স্ক্রিপ্ট URL
                    </label>
                    <input
                      type="text"
                      value={formConfig.ad2ScriptUrl}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, ad2ScriptUrl: e.target.value })
                      }
                      placeholder="https://bauval.org/21/..."
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ব্যানার কন্টেইনার আইডি (Container ID)
                    </label>
                    <input
                      type="text"
                      value={formConfig.ad2ContainerId}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, ad2ContainerId: e.target.value })
                      }
                      placeholder="container-3359dfb49d3904ef22e968fbd601bd0f"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Slot Quantities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ভিডিওর উপরে ব্যানারের সংখ্যা (Top Banners)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formConfig.topBannerCount}
                      onChange={(e) =>
                        setFormConfig({
                          ...formConfig,
                          topBannerCount: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ভিডিওর নিচে ব্যানারের সংখ্যা (Bottom Banners)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formConfig.bottomBannerCount}
                      onChange={(e) =>
                        setFormConfig({
                          ...formConfig,
                          bottomBannerCount: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ডিফল্ট সেটিংসে রিসেট</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>পরিবর্তন সংরক্ষণ করুন (Save)</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: PUBLIC LIVE WEBSITE (Clean White)
  // ==========================================
  // Embed URL with api=1 and player_id for official Vimeo Player SDK control
  const embedUrl = `https://player.vimeo.com/video/${config.videoId}?autoplay=1&muted=0&loop=1&autopause=0&playsinline=1&api=1&badge=0&player_id=vimeo-player-main`;

  return (
    <div
      onClick={triggerAutoSound}
      onTouchStart={triggerAutoSound}
      className="min-h-screen w-full bg-white text-slate-900 flex flex-col items-center"
    >
      {/* Top Floating Quick Scroll Pill */}
      {config.autoScroll && (
        <div className="sticky top-2 z-40 my-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollToVideo('smooth');
            }}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            <span>সরাসরি ভিডিওতে যান ও সাউন্ড শুনুন</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          </button>
        </div>
      )}

      {/* Top Ads: Dynamic Count */}
      {config.topBannerCount > 0 && (
        <section className="w-full max-w-7xl px-4 py-6">
          <div className="text-center mb-4">
            <span className="text-xs text-slate-400 font-medium">
              বিজ্ঞাপন (উপরে {config.topBannerCount}টি ব্যানার)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
            {Array.from({ length: config.topBannerCount }).map((_, idx) => (
              <AdBanner300x250
                key={`top-ad-slot-${idx}`}
                index={idx + 1}
                scriptUrl={config.ad2ScriptUrl}
                containerId={config.ad2ContainerId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Video Stage */}
      <section
        ref={videoSectionRef}
        id="video-player-container"
        className="w-full max-w-5xl px-4 my-8 scroll-mt-16"
      >
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-black">
          <iframe
            ref={iframeRef}
            id="vimeo-player-main"
            src={embedUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            allowFullScreen
            title="Vimeo Video Player"
          />

          {/* Floating Sound State Notification (Disappears when unmuted) */}
          {!soundEnabled && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                triggerAutoSound();
              }}
              className="absolute inset-x-0 bottom-4 mx-auto w-fit z-20 px-5 py-2.5 bg-slate-900/95 hover:bg-black text-white rounded-full shadow-2xl border border-slate-700/80 text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer animate-pulse"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>সাউন্ড শুনতে এখানে স্পর্শ করুন (সাউন্ড ফুল ১০০%)</span>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Ads: Dynamic Count */}
      {config.bottomBannerCount > 0 && (
        <section className="w-full max-w-7xl px-4 py-8">
          <div className="text-center mb-4">
            <span className="text-xs text-slate-400 font-medium">
              বিজ্ঞাপন (নিচে {config.bottomBannerCount}টি ব্যানার)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
            {Array.from({ length: config.bottomBannerCount }).map((_, idx) => (
              <AdBanner300x250
                key={`bottom-ad-slot-${idx}`}
                index={idx + config.topBannerCount + 1}
                scriptUrl={config.ad2ScriptUrl}
                containerId={config.ad2ContainerId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
