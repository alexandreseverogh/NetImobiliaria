const pool = require('./src/lib/database/connection').pool;

async function validateLogo() {
  try {
    const result = await pool.query("SELECT name, logo, logo_mime_type FROM tenants WHERE name ILIKE 'IMOVITEC%'");
    const t = result.rows[0];
    if (t && t.logo) {
      let buffer;
      if (Buffer.isBuffer(t.logo)) {
        buffer = t.logo;
        console.log('Formato Detectado: Buffer');
      } else if (typeof t.logo === 'string' && t.logo.startsWith('\\x')) {
        buffer = Buffer.from(t.logo.substring(2), 'hex');
        console.log('Formato Detectado: Hex String (\\x)');
      } else {
        buffer = Buffer.from(t.logo);
        console.log('Formato Detectado: Desconhecido/Fallback');
      }
      
      const b64 = buffer.toString('base64');
      const dataUrl = `data:${t.logo_mime_type};base64,${b64}`;
      console.log('Nome:', t.name);
      console.log('MimeType:', t.logo_mime_type);
      console.log('Tamanho do Buffer:', buffer.length);
      console.log('Tamanho da DataURL:', dataUrl.length);
      console.log('Início da DataURL:', dataUrl.substring(0, 50));
    } else {
      console.log('Empresa não encontrada ou sem logo.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

validateLogo();
