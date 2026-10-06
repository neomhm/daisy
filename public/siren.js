/* The Siren page: a little scroll down from the animated squares glides to the profiles, and a little
   one up from the top of the profiles glides back (the shared glide, snap.js). */
(() => {
  const profiles = document.getElementById('voice');
  if (profiles) window.akikiSnap(profiles);
})();
