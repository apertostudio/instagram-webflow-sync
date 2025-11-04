#!/usr/bin/env node

/**
 * Script per forzare la sincronizzazione immediata dei post Instagram
 * 
 * Questo script chiama l'endpoint Netlify per forzare l'aggiornamento immediato
 * mantenendo comunque attiva la sincronizzazione automatica schedulata.
 * 
 * Uso:
 *   node sync-now.js
 *   oppure
 *   npm run sync-now
 */

// Ottieni l'URL del sito Netlify dalle variabili d'ambiente o configurazione
const NETLIFY_SITE_URL = process.env.NETLIFY_SITE_URL || process.env.URL || '';

if (!NETLIFY_SITE_URL) {
  console.error('❌ Errore: NETLIFY_SITE_URL non configurato.');
  console.log('');
  console.log('Configura l\'URL del tuo sito Netlify in uno di questi modi:');
  console.log('  1. Variabile d\'ambiente: export NETLIFY_SITE_URL=https://tuo-sito.netlify.app');
  console.log('  2. Nel file .env: NETLIFY_SITE_URL=https://tuo-sito.netlify.app');
  console.log('  3. Passa l\'URL come parametro: node sync-now.js https://tuo-sito.netlify.app');
  console.log('');
  process.exit(1);
}

const endpoint = `${NETLIFY_SITE_URL}/.netlify/functions/sync-now`;

async function syncNow() {
  console.log('🔄 Avvio sincronizzazione immediata dei post Instagram...');
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log('');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Sincronizzazione completata con successo!');
      console.log(`📊 Post sincronizzati: ${data.synced || 'N/A'}`);
      console.log(`⏰ Timestamp: ${data.timestamp || new Date().toISOString()}`);
      if (data.message) {
        console.log(`💬 ${data.message}`);
      }
    } else {
      console.error('❌ Errore durante la sincronizzazione:');
      console.error(data.error || 'Errore sconosciuto');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Errore di connessione:');
    console.error(error.message);
    console.log('');
    console.log('Verifica che:');
    console.log('  1. Il sito Netlify sia deployato correttamente');
    console.log('  2. L\'URL del sito sia corretto');
    console.log('  3. La funzione sync-now sia disponibile');
    process.exit(1);
  }
}

// Se l'URL è passato come parametro, usalo
const args = process.argv.slice(2);
if (args.length > 0 && args[0].startsWith('http')) {
  const customUrl = args[0].replace(/\/$/, ''); // Rimuovi trailing slash
  process.env.NETLIFY_SITE_URL = customUrl;
  syncNow();
} else {
  syncNow();
}

