(function(){
  const KEY='aim_cookie_consent_v1';

  // ---- inject banner HTML once ----
  function injectBanner(){
    if(document.getElementById('cc-banner')) return;
    const wrap=document.createElement('div');
    wrap.id='cc-banner';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-live','polite');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-label','Scelta cookie');
    wrap.hidden=true;
    wrap.innerHTML=`
      <div id="cc-panel">
        <h2>La tua privacy</h2>
        <p>Usiamo cookie tecnici e, previo consenso, servizi di terze parti (es. mappe). Puoi accettare, rifiutare o scegliere le preferenze.</p>
        <details id="cc-details">
          <summary>Preferenze</summary>
          <form id="cc-form" aria-label="Preferenze cookie">
            <label class="cc-row"><input type="checkbox" checked disabled> Tecnici (necessari)</label>
            <label class="cc-row"><input type="checkbox" name="thirdparty"> Funzionalità/terze parti (Google Maps, YouTube)</label>
          </form>
          <p class="cc-links">
            <a href="/cookie.html" target="_blank" rel="noopener">Cookie Policy</a> ·
            <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>
          </p>
        </details>
        <div class="cc-actions">
          <button id="cc-accept" type="button">Accetta tutto</button>
          <button id="cc-reject" type="button">Rifiuta</button>
          <button id="cc-save" class="secondary" type="button">Salva preferenze</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  const getConsent=()=>{ try{return JSON.parse(localStorage.getItem(KEY))||null;}catch(e){return null;} };
  const setConsent=o=>localStorage.setItem(KEY,JSON.stringify(o));

  function applyConsent(){
    const c=getConsent();
    document.querySelectorAll('[data-embed]').forEach(el=>{
      const type=el.getAttribute('data-embed'); // 'thirdparty' | 'analytics' | ...
      const src=el.getAttribute('data-src');
      const holder=el.querySelector('[data-embed-placeholder]');
      const btn=el.querySelector('[data-embed-enable]');
      const allowed=c && c[type]===true;
      if(allowed && src){
        holder?.remove(); btn?.remove();
        if(!el.querySelector('iframe')){
          const f=document.createElement('iframe');
          f.setAttribute('src',src);
          f.setAttribute('loading','lazy');
          f.setAttribute('title',el.getAttribute('data-title')||'contenuto esterno');
          f.setAttribute('style','width:100%;height:100%;border:0');
          el.appendChild(f);
        }
      }
    });
  }

  function openBannerIfNeeded(){
    const b=document.getElementById('cc-banner');
    if(!getConsent()){ b.hidden=false; }
  }

  function wireButtons(){
    const b=document.getElementById('cc-banner');
    const form=document.getElementById('cc-form');
    const btnAccept=document.getElementById('cc-accept');
    const btnReject=document.getElementById('cc-reject');
    const btnSave=document.getElementById('cc-save');

    btnAccept?.addEventListener('click',()=>{ setConsent({necessary:true,thirdparty:true}); b.hidden=true; applyConsent(); });
    btnReject?.addEventListener('click',()=>{ setConsent({necessary:true,thirdparty:false}); b.hidden=true; applyConsent(); });
    btnSave?.addEventListener('click',()=>{
      const prefs={necessary:true};
      if(form){ prefs.thirdparty=!!form.querySelector('input[name="thirdparty"]')?.checked; }
      setConsent(prefs); b.hidden=true; applyConsent();
    });

    document.addEventListener('click',e=>{
      const t=e.target.closest('[data-embed-enable]'); if(!t) return;
      const type=t.getAttribute('data-embed-enable'); // es. 'thirdparty'
      const current=getConsent()||{necessary:true,thirdparty:false};
      current[type]=true; setConsent(current); applyConsent();
    });
  }

  // API globale per aprire il pannello dal footer
  window.openConsentModal=function(){
    const b=document.getElementById('cc-banner');
    if(b){ b.hidden=false; b.focus(); }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    injectBanner();
    wireButtons();
    applyConsent();
    openBannerIfNeeded();
  });
})();
