'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const LP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.lp-root *,.lp-root *::before,.lp-root *::after{box-sizing:border-box;margin:0;padding:0}
.lp-root{font-family:'Inter',-apple-system,sans-serif;background:#050709;color:#e2e8f0;overflow-x:hidden;position:relative}
#lp-canvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none}
.lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;transition:background .3s,border-color .3s,backdrop-filter .3s;border-bottom:1px solid transparent}
.lp-nav.lp-scrolled{background:rgba(5,7,9,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-color:rgba(255,255,255,0.08)}
.lp-logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none}
.lp-logo-box{position:relative;width:36px;height:36px;flex-shrink:0}
.lp-logo-ring{position:absolute;inset:-3px;border-radius:12px;background:conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6);animation:lp-spin 3s linear infinite}
.lp-logo-inner{position:absolute;inset:2px;border-radius:9px;background:#080b12;display:flex;align-items:center;justify-content:center}
@keyframes lp-spin{to{transform:rotate(360deg)}}
.lp-logo-name{font-size:18px;font-weight:800;color:#e2e8f0;letter-spacing:-.02em}
.lp-nav-links{display:flex;align-items:center;gap:32px}
.lp-nav-links a{font-size:14px;font-weight:500;color:rgba(255,255,255,0.55);text-decoration:none;transition:color .2s}
.lp-nav-links a:hover{color:#e2e8f0}
.lp-nav-right{display:flex;align-items:center;gap:12px}
.lp-btn-ghost{padding:8px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.6);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
.lp-btn-ghost:hover{border-color:rgba(255,255,255,0.25);color:#e2e8f0}
.lp-btn-nav-cta{padding:9px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(99,102,241,0.35);transition:all .2s}
.lp-btn-nav-cta:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,0.5)}
.lp-sec{position:relative;z-index:1}
.lp-sec-wrap{max-width:1100px;margin:0 auto;padding:100px 48px}
.lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 48px 80px;position:relative;z-index:1}
.lp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(80,40,160,0.22),transparent 65%);pointer-events:none}
.lp-scroll-ind{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;animation:lp-bob 2.4s ease-in-out infinite}
@keyframes lp-bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}
.lp-scroll-ind span{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,0.2)}
.lp-scroll-ind svg{opacity:.2}
.lp-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:100px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);margin-bottom:28px;backdrop-filter:blur(10px)}
.lp-badge-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 10px #10b981;animation:lp-dp 2s ease-in-out infinite}
@keyframes lp-dp{0%,100%{box-shadow:0 0 10px #10b981}50%{box-shadow:0 0 18px #10b981,0 0 30px rgba(16,185,129,0.4)}}
.lp-hero-title{font-size:clamp(52px,6.5vw,88px);font-weight:900;letter-spacing:-.04em;line-height:1.05;margin-bottom:20px;padding-bottom:0.28em}
.lp-hero-line{display:block;animation:lp-line-up .9s both;padding-bottom:0.28em;overflow:visible;white-space:nowrap}
.lp-hl1{background:linear-gradient(135deg,#fff,#c4b5fd 40%,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation-delay:.0s}
.lp-hl2{background:linear-gradient(135deg,#fce7f3,#f9a8d4 35%,#f472b6 65%,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation-delay:.15s}
.lp-hl3{background:linear-gradient(135deg,#bfdbfe,#93c5fd 35%,#60a5fa 65%,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation-delay:.3s}
@keyframes lp-line-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.lp-hero-sub{font-size:clamp(16px,1.5vw,19px);color:rgba(255,255,255,0.42);line-height:1.7;max-width:580px;margin:0 auto 36px;animation:lp-line-up .9s .45s both}
.lp-hero-btns{display:flex;gap:14px;align-items:center;justify-content:center;animation:lp-line-up .9s .6s both}
.lp-btn-primary{padding:15px 32px;border-radius:14px;border:none;font-family:inherit;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2563eb,#7c3aed);box-shadow:0 8px 28px rgba(99,102,241,0.45);position:relative;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s}
.lp-btn-primary::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);transform:translateX(-100%);animation:lp-shine 2.8s ease infinite}
@keyframes lp-shine{0%{transform:translateX(-100%)}55%,100%{transform:translateX(200%)}}
.lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(99,102,241,0.6)}
.lp-btn-sec{padding:15px 28px;border-radius:14px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.75);font-size:15px;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:9px;cursor:pointer;transition:all .2s;backdrop-filter:blur(8px)}
.lp-btn-sec:hover{border-color:rgba(255,255,255,0.28);background:rgba(255,255,255,0.11);color:#e2e8f0}
.lp-sdot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 10px #10b981;animation:lp-dp 2s ease-in-out infinite}
.lp-eyebrow{display:flex;align-items:center;justify-content:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#818cf8;margin-bottom:16px}
.lp-eyebrow::before,.lp-eyebrow::after{content:'';display:block;width:20px;height:1.5px;background:linear-gradient(90deg,transparent,#6366f1)}
.lp-eyebrow::after{background:linear-gradient(90deg,#6366f1,transparent)}
.lp-sec-title{font-size:clamp(32px,3.8vw,52px);font-weight:800;letter-spacing:-.03em;text-align:center;margin-bottom:14px;padding-bottom:0.15em}
.lp-sec-body-c{font-size:clamp(15px,1.4vw,18px);color:rgba(255,255,255,0.38);text-align:center;line-height:1.7;max-width:600px;margin:0 auto 40px}
.lp-rv{opacity:0;transform:translateY(36px);transition:opacity .85s cubic-bezier(.23,1,.32,1),transform .85s cubic-bezier(.23,1,.32,1)}
.lp-rv.lp-visible{opacity:1;transform:none}
.lp-d1{transition-delay:.08s}.lp-d2{transition-delay:.18s}.lp-d3{transition-delay:.28s}.lp-d4{transition-delay:.38s}
.lp-cc-sec{background:linear-gradient(180deg,transparent,rgba(8,10,20,0.7) 15%,rgba(8,10,20,0.7) 85%,transparent)}
.lp-cc-card{background:rgba(8,12,22,0.9);border:1px solid rgba(255,255,255,0.1);border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 120px rgba(99,102,241,0.06);backdrop-filter:blur(12px)}
.lp-cc-top{padding:13px 22px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:16px;background:rgba(255,255,255,0.03)}
.lp-live-badge{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#f87171;letter-spacing:.04em}
.lp-live-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 10px #ef4444;animation:lp-lb 1.2s ease-in-out infinite}
@keyframes lp-lb{0%,100%{opacity:1}50%{opacity:.25}}
.lp-cc-class{margin-left:auto;font-size:12px;color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.07);padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.1)}
.lp-cc-timer{font-size:15px;font-weight:800;color:#fbbf24;font-variant-numeric:tabular-nums;min-width:36px;text-align:right}
.lp-cc-body{display:grid;grid-template-columns:1fr 1fr;gap:0}
.lp-cc-left{padding:28px 26px;border-right:1px solid rgba(255,255,255,0.07)}
.lp-cc-meta{font-size:10px;font-weight:700;color:rgba(255,255,255,0.22);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
.lp-cc-q{font-size:17px;font-weight:700;color:#e2e8f0;line-height:1.4;margin-bottom:20px}
.lp-choices{display:flex;flex-direction:column;gap:9px}
.lp-ch{padding:11px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);font-size:13px;font-weight:500;color:rgba(255,255,255,0.65);display:flex;al