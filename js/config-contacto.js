/* =========================================================
   Configuración del formulario de Contacto (contacto.html)
   Si dejas las llaves vacías, el formulario sigue funcionando
   con el botón «Abrir mi correo con el mensaje».

   1) Supabase (guarda cada mensaje en una tabla):
      - Crea un proyecto en https://supabase.com y corre supabase/mensajes.sql
      - Settings > API: copia «Project URL» y la llave «anon / publishable»
   2) Web3Forms (te avisa por correo cuando llega un mensaje):
      - En https://web3forms.com pon tu correo y copia tu «Access key»
   Estas llaves son públicas por diseño: solo permiten ESCRIBIR mensajes.
   ========================================================= */
window.CONFIG_CONTACTO = {
  supabaseUrl: 'https://vsgedtshgzpdaraxxjpa.supabase.co',   // ejemplo: 'https://abcdefgh.supabase.co'
  supabaseKey: 'sb_publishable_dGqXTPGz1Wa9r5KPK-65oA_XnkHe4O4',   // llave anon / publishable
  web3formsKey: 'fc1a177c-476f-438f-923f-ea6656ab59ef'   // ejemplo: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
};
