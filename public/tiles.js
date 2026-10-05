/* THE TILES OF THE WORKBENCH: the one place that says what every tile is.

   workbench.js builds the panel of tiles from this file (on workbench.html and on the home page),
   colours each tile by its ROLE, and its TesT key checks a team against these rules. Edit a tile
   here and both pages follow; nothing about a tile is written anywhere else.

   role      start      takes the data in; only a start can begin a chain (a chat, a feeder, a scanner,
                        or a model that reads your files or your database)
             middle     works on what the tile on its left hands it, and hands its own work on
             end        gives the result (a chat's answer, an image, an API, a port)
             both       a start and an end at once (Siren: drawn in two colours). With "hub": true,
                        the tiles touching her are specialists she calls, and their answer comes back
                        to her, so "Siren, Daisy, Siren" is one Siren with Daisy beside her
             attachment not part of the chain: it snaps ONTO a tile that needs it (a brain, a
                        database, a documents folder)
   in, out   the kinds of data a tile accepts and hands on (see KINDS). "*" in "in" means any result.
             Two tiles side by side fit when the left one's out shares a kind with the right one's in.
   needs     attachments the tile cannot work without; "takes" lists ones it may use if given
   gives     for an attachment: which need it fills
   status    working (built, figures measured) | design (designed, not built) | notbuilt (named by
             Laurent, not designed yet) | yours (your own data: no figures of its own)
   params, ms, mb   millions of parameters, milliseconds per call, megabytes on disk; "" when there
             is no measurement. Never estimated.
   glyph     only for tiles with no pixel icon in the page's sprite: a 5 x 5 drawing in the logo's
             pixels (X white, H gold), as tools/make_pixel_icons.py draws the others.

   Every role, kind and need below is a PROPOSAL (2026-10-06) for Laurent to correct. */
window.AKIKI_TILES = {
  roles: {
    start: { label: 'start', say: 'starts a chain' },
    middle: { label: 'middle', say: 'works in the middle of a chain' },
    end: { label: 'end', say: 'ends a chain with a result' },
    both: { label: 'start + end', say: 'starts and ends a chain' },
    attachment: { label: 'attach to a tile', say: 'attaches onto a tile that needs it' },
  },
  // Each kind as a sentence says it: "Tulip gives a table, Lily needs facts".
  kinds: {
    text: 'words', question: 'a question', request: 'a task', table: 'a table', spec: 'an SQL query',
    reading: 'a reading of the database', facts: 'facts', document: 'documents', plan: 'a plan',
    design: 'a design', image: 'an image', code: 'code', findings: 'findings', ranking: 'a ranking',
    message: 'a message to a person',
  },
  needs: { brain: 'a brain', database: 'a database', documents: 'a documents folder', memory: 'a memory' },
  groups: [
    { id: 'flowers', head: 'Daisy’s flowers' },
    { id: 'insects', head: 'Butterfly’s insects' },
    { id: 'sea', head: 'Siren’s sea creatures' },
    { id: 'attach', head: 'Brains and your data' },
    { id: 'io', head: 'Starts and ends, not built yet' },
  ],
  tiles: [
    // Daisy's flowers (PLAN)
    { id: 'bouquet', name: 'Bouquet', words: 'Plans the work', group: 'flowers', colour: '#35adb0',
      role: 'middle', in: ['text', 'request', 'facts', 'document'], out: ['plan'], needs: ['brain'],
      status: 'working', params: '', ms: '24500', mb: '', tags: 'website',
      note: 'a planning prompt and its checker on the brain you attach; 17 to 32 s per call on the 27B, counted as 24.5 s' },
    { id: 'orchid', name: 'Orchid', words: 'Finds the facts', group: 'flowers', colour: '#c2549e',
      role: 'start', in: [], out: ['facts'], needs: ['documents'],
      status: 'working', params: '32.8', ms: '77', mb: '131', tags: 'documents',
      note: '32.8M parameters, 131 MB, 77 ms per chunk' },
    { id: 'tulip', name: 'Tulip', words: 'Imports spreadsheets', group: 'flowers', colour: '#3aa56f',
      role: 'start', in: [], out: ['table'], needs: ['documents'],
      status: 'working', params: '61.6', ms: '120', mb: '', tags: 'database documents',
      note: '61.6M parameters, 0.12 s per sheet' },
    { id: 'jasmine', name: 'Jasmine', words: 'Dresses the site', group: 'flowers', colour: '#a06fc2',
      role: 'middle', in: ['facts', 'plan'], out: ['design'], needs: [],
      status: 'working', params: '3.4', ms: '9', mb: '13.5', tags: 'website',
      note: '3.4M parameters, 13.5 MB; about 9 ms per design, measured on a network her size' },
    { id: 'daisy', name: 'Daisy', words: 'Answers questions', group: 'flowers', colour: '#ec8e4a',
      role: 'middle', in: ['question', 'reading'], out: ['table', 'spec'], needs: ['database'],
      status: 'working', params: '27.1', ms: '270', mb: '108', tags: 'database',
      note: '27.1M parameters, 108 MB, 0.27 s from question to rows' },
    { id: 'magnolia', name: 'Magnolia', words: 'Reads databases', group: 'flowers', colour: '#de7c95',
      role: 'start', in: [], out: ['reading'], needs: ['database'],
      status: 'working', params: '0.9', ms: '1800', mb: '', tags: 'database',
      note: '0.9M parameters, 1.8 s per database' },
    { id: 'iris', name: 'Iris', words: 'Watches live sites', group: 'flowers', colour: '#7c8acb',
      role: 'middle', in: ['design'], out: ['findings'], needs: [],
      status: 'working', params: '3.4', ms: '14', mb: '', tags: 'website checks',
      note: '3.4M parameters, 14 ms per page' },
    { id: 'thistle', name: 'Thistle', words: 'Guards the site', group: 'flowers', colour: '#94549f',
      role: 'middle', in: ['design', 'code'], out: ['findings'], needs: [],
      status: 'working', params: '', ms: '400', mb: '', tags: 'website checks',
      note: 'code checks, no size of her own; 0.2 to 0.6 s per audit, counted as 0.4 s' },
    { id: 'lily', name: 'Lily', words: 'Makes the logo', group: 'flowers', colour: '#e65b56',
      role: 'end', in: ['facts', 'document'], out: ['image'], needs: ['documents'],
      status: 'design', params: '', ms: '', mb: '', tags: 'website documents',
      note: 'not built yet, no figures' },
    // Butterfly's insects (PLAN 2): all in design
    { id: 'butterfly', name: 'Butterfly', words: 'Leads the team', group: 'insects', colour: '#2fb39a',
      role: 'middle', in: ['text', 'request'], out: ['plan'], needs: ['brain'], takes: ['memory'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'cricket', name: 'Cricket', words: 'Asks first', group: 'insects', colour: '#3aa56f',
      role: 'middle', in: ['text'], out: ['request'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'bees', name: 'Bees', words: 'Write the code', group: 'insects', colour: '#f0a444',
      role: 'middle', in: ['plan', 'request'], out: ['code'], needs: ['brain'], takes: ['memory'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'ants', name: 'Ants', words: 'Tiny specialists', group: 'insects', colour: '#a0452e',
      role: 'middle', in: ['plan', 'request'], out: ['code'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'mantis', name: 'Mantis', words: 'Audits each piece', group: 'insects', colour: '#7fae3e',
      role: 'middle', in: ['code'], out: ['findings'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'in design, no figures yet' },
    { id: 'ladybug', name: 'Ladybug', words: 'Hunts bugs', group: 'insects', colour: '#e65b56',
      role: 'middle', in: ['code'], out: ['findings'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'in design, no figures yet' },
    { id: 'cicada', name: 'Cicada', words: 'Keeps the memory', group: 'insects', colour: '#8a80cf',
      role: 'attachment', gives: 'memory',
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'dragonfly', name: 'Dragonfly', words: 'Searches by meaning', group: 'insects', colour: '#6592b4',
      role: 'middle', in: ['question', 'text'], out: ['ranking'], needs: ['documents'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code documents', note: 'in design, no figures yet' },
    { id: 'firefly', name: 'Firefly', words: 'Calls for help', group: 'insects', colour: '#ec8e4a',
      role: 'end', in: ['findings'], out: ['message'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    // Siren's sea creatures (PLAN 3)
    { id: 'siren', name: 'Siren', words: 'Talks with you', group: 'sea', colour: '#2b7fd4',
      role: 'both', hub: true, in: ['*'], out: ['question', 'request', 'text'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'voice', note: 'designed, not built or measured yet' },
    // Attachments: brains, and your own data
    { id: 'qwen27b', name: 'Qwen 27B', words: 'A brain', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'brain', glyph: ['.X.X.', 'XXXXX', 'XHXHX', 'XXXXX', '.X.X.'],
      status: 'working', params: '27000', ms: '', mb: '17700', tags: 'brains',
      note: '27B class, 17.7 GB of weights; the engine Bouquet runs on today' },
    { id: 'glimmer', name: 'Muse Glimmer', words: 'A brain', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'brain', glyph: ['X.X.X', '.XHX.', 'XHHHX', '.XHX.', 'X.X.X'],
      status: 'working', params: '', ms: '', mb: '', tags: 'brains',
      note: 'a general model by Meta, not measured on this page yet' },
    { id: 'database', name: 'Database', words: 'Your own data', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'database', glyph: ['.XXX.', 'X...X', 'XHHHX', 'X...X', '.XXX.'],
      status: 'yours', params: '', ms: '', mb: '', tags: 'database',
      note: 'your own database (SQLite, PostgreSQL or MySQL), read only' },
    { id: 'folder', name: 'Documents', words: 'Your files', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'documents', glyph: ['XX...', 'XXXXX', 'X...X', 'X.H.X', 'XXXXX'],
      status: 'yours', params: '', ms: '', mb: '', tags: 'documents',
      note: 'a folder of your documents and spreadsheets, read only' },
    // Starts and ends Laurent named, not built yet
    { id: 'feeder', name: 'Feeder', words: 'Feeds your documents (RAG)', group: 'io', colour: '#6a7480',
      role: 'start', in: [], out: ['document'], needs: ['documents'], glyph: ['X.X.X', '.....', 'XXXXX', '.XHX.', '..X..'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'documents', note: 'not built yet' },
    { id: 'scanner', name: 'Scanner', words: 'Reads paper and photos', group: 'io', colour: '#6a7480',
      role: 'start', in: [], out: ['document'], needs: [], glyph: ['XXXXX', 'X...X', 'HHHHH', 'X...X', 'XXXXX'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'documents', note: 'not built yet' },
    { id: 'api', name: 'API', words: 'Sends the result to an API', group: 'io', colour: '#6a7480',
      role: 'end', in: ['*'], out: [], needs: [], glyph: ['X.H.X', '.X.X.', '..X..', '..X..', '.XXX.'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'code', note: 'not built yet' },
    { id: 'port', name: 'Port', words: 'Broadcasts on a port', group: 'io', colour: '#6a7480',
      role: 'end', in: ['*'], out: [], needs: [], glyph: ['.X.X.', '.X.X.', 'XXXXX', '.XHX.', '..X..'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'code', note: 'not built yet' },
  ],
};
