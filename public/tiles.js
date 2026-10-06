/* THE TILES OF THE WORKBENCH: the one place that says what every tile is.

   workbench.js builds the panel of tiles from this file (on workbench.html and on the home page),
   marks each tile's ROLE with a small square, and its TesT key checks a team against these rules. Edit a tile
   here and both pages follow; nothing about a tile is written anywhere else.

   role      reader     a starter OR a function: with nothing before it, it starts the chain from what is
                        attached to it ("startNeeds", e.g. a Documents folder); after a tile that brings
                        what it accepts ("in"), it works on that instead and needs no attachment
             start      takes the data in; only a start can begin a chain (a chat, a feeder, a scanner,
                        or a model that reads your files or your database)
             middle     works on what the tile on its left hands it, and hands its own work on
             end        gives the result (a chat's answer, an image, an API, a port)
             both       a start and an end at once (Siren: drawn in two colours). With "hub": true,
                        the tiles touching her are specialists she calls, and their answer comes back
                        to her, so "Siren, Daisy, Siren" is one Siren with Daisy beside her
             attachment not part of the chain: it snaps ONTO a tile that needs it (a brain, a
                        database, a documents folder)
             lens       THE lens (MAGNOLIA): one model that adapts to the model it touches and to the
                        data attached to it, switching into one of her roles ("heads") on her own; placed
                        touching a model it serves, joined by a lens joint, and not a step of the chain
             (skill     room is left for SKILLS, their own kind, not built yet: a tile with role 'skill'
                        goes in the Skills section)
   lenses    on a model: { needs: [...], best: [...] }: the lenses it cannot work without, and the
             ones it works best with. A need may carry "unless": an attachment that makes it a
             "works best with" instead (Daisy on PLAN's own tables does not need MAGNOLIA).
   in, out   the kinds of data a tile accepts and hands on (see KINDS). "*" in "in" means any result.
             Two tiles side by side fit when the left one's out shares a kind with the right one's in.
   needs     attachments the tile cannot work without; "takes" lists ones it may use if given
   gives     for an attachment: which need it fills
   kind      ai (a trained model; the default) | code (no brain, always does the same) | hybrid (a model
             plus code checks) | data (your own data). The panel draws each kind its own way.
   chat      the Chat window: where a conversation starts and ends; Siren works only beside one
   unlessFed a need waived when the tile before it brings that kind ({ documents: 'document' }: Lily needs
             no folder when a Feeder or a Scanner hands her documents)
   status    working (built, figures measured) | design (designed, not built) | notbuilt (named by
             Laurent, not designed yet) | yours (your own data: no figures of its own)
   params, ms, mb   millions of parameters, milliseconds per call, megabytes on disk; "" when there
             is no measurement. Never estimated.
   glyph     only for tiles with no pixel icon in the page's sprite: a 5 x 5 drawing in the logo's
             pixels (X white, H gold), as tools/make_pixel_icons.py draws the others.

   Every role, kind and need below is a PROPOSAL (2026-10-06) for Laurent to correct. */
window.AKIKI_TILES = {
  roles: {
    start: { label: 'starter', say: 'starts a chain' },
    reader: { label: 'starter or function', say: 'starts a chain from what is attached to it, or works on what the tile before it brings' },
    middle: { label: 'function', say: 'works in the middle of a chain' },
    end: { label: 'finisher', say: 'finishes a chain with a result' },
    both: { label: 'starter + finisher', say: 'starts and finishes a chain' },
    lens: { label: 'lens', say: 'is the lens: touching a model, she adapts to it and to the data it reads' },
    attachment: { label: 'attaches to a tile', say: 'attaches onto a tile that needs it' },
  },
  // Each kind as a sentence says it: "Tulip gives a table, Lily needs facts".
  kinds: {
    text: 'words', question: 'a question', request: 'a task', table: 'a table', spec: 'an SQL query',
    reading: 'a reading of the database', facts: 'facts', document: 'documents', plan: 'a plan',
    design: 'a design', image: 'an image', code: 'code', findings: 'findings', ranking: 'a ranking',
    message: 'a message to a person',
  },
  needs: { brain: 'a brain', database: 'a database', documents: 'a documents folder', memory: 'a memory' },
  // The panel is ordered by what a tile is FOR (workbench.js puts each tile in its section from its
  // role); "group" says which plan a tile comes from, shown as a small PLAN tag.
  sections: [
    { id: 'starters', head: 'Starters' }, { id: 'functions', head: 'Functions' }, { id: 'finishers', head: 'Finishers' },
    { id: 'lenses', head: 'Lens & add-ons' }, { id: 'skills', head: 'Skills' }, { id: 'brains', head: 'Brains' }, { id: 'data', head: 'Data' },
  ],
  plans: { flowers: 'PLAN 1', insects: 'PLAN 2', sea: 'PLAN 3' },
  tiles: [
    // Daisy's flowers (PLAN)
    { id: 'bouquet', name: 'Bouquet', words: 'Plans the work', group: 'flowers', colour: '#35adb0',
      role: 'middle', in: ['text', 'request', 'facts', 'document', 'table'], out: ['plan'], needs: ['brain'], lenses: { best: ['magnolia'] },
      status: 'working', params: '', ms: '24500', mb: '', tags: 'website',
      note: 'a planning prompt and its checker on the brain you attach; 17 to 32 s per call on the 27B, counted as 24.5 s' },
    { id: 'orchid', name: 'Orchid', words: 'Finds the facts', group: 'flowers', colour: '#c2549e',
      role: 'reader', in: ['document'], out: ['facts'], needs: [], startNeeds: ['documents'], lenses: { best: ['magnolia'] },
      status: 'working', params: '32.8', ms: '77', mb: '131', tags: 'documents',
      note: '32.8M parameters, 131 MB, 77 ms per chunk' },
    { id: 'tulip', name: 'Tulip', words: 'Imports spreadsheets', group: 'flowers', colour: '#3aa56f',
      role: 'reader', in: ['document'], out: ['table'], needs: [], startNeeds: ['documents'], lenses: { best: ['magnolia'] },
      status: 'working', params: '61.6', ms: '120', mb: '', tags: 'database documents',
      note: '61.6M parameters, 0.12 s per sheet' },
    { id: 'jasmine', kind: 'hybrid', name: 'Jasmine', words: 'Dresses the site', group: 'flowers', colour: '#a06fc2',
      role: 'middle', in: ['facts', 'plan'], out: ['design'], needs: [], lenses: { best: ['magnolia'] },
      status: 'working', params: '3.4', ms: '9', mb: '13.5', tags: 'website',
      note: '3.4M parameters, 13.5 MB; about 9 ms per design, measured on a network her size' },
    { id: 'daisy', name: 'Daisy', words: 'Answers questions', group: 'flowers', colour: '#ec8e4a',
      role: 'middle', in: ['question', 'reading', 'table', 'plan'], out: ['table', 'spec'], needs: ['database'],
      lenses: { needs: [{ lens: 'magnolia', unless: 'plantables', why: 'on an unfamiliar database' }] },
      status: 'working', params: '27.1', ms: '270', mb: '108', tags: 'database',
      note: '27.1M parameters, 108 MB, 0.27 s from question to rows' },
    { id: 'magnolia', name: 'MAGNOLIA', words: 'The lens: adapts to the model it serves and to the data it reads', group: 'flowers', colour: '#de7c95',
      role: 'lens', serves: ['daisy', 'tulip', 'orchid', 'bouquet', 'dragonfly', 'lily', 'jasmine'], in: [], out: [], needs: [],
      adapts: 'what she does depends on the model she touches and the data attached to it: beside Daisy on an unfamiliar database she reads its names; on PLAN tables she is optional',
      heads: [
        { does: 'reading unfamiliar names', status: 'trained, gate passed, not yet in use' },
        { does: 'values', status: 'designed, not built yet' }, { does: 'links between tables', status: 'designed, not built yet' },
        { does: 'dates', status: 'designed, not built yet' }, { does: 'language', status: 'designed, not built yet' },
        { does: 'privacy', status: 'designed, not built yet' },
      ],
      status: 'gate', params: '0.9', ms: '1800', mb: '', tags: 'database lenses',
      note: 'reading names: trained, gate passed, not yet in use; 0.9M parameters, 1.8 s per database' },
    { id: 'iris', kind: 'hybrid', name: 'Iris', words: 'Watches live sites', group: 'flowers', colour: '#7c8acb',
      role: 'end', in: ['design'], out: ['findings'], needs: [],
      status: 'working', params: '3.4', ms: '14', mb: '', tags: 'website checks',
      note: '3.4M parameters, 14 ms per page' },
    { id: 'thistle', kind: 'code', name: 'Thistle', words: 'Guards the site', group: 'flowers', colour: '#94549f',
      role: 'end', in: ['design', 'code'], out: ['findings'], needs: [],
      status: 'working', params: '', ms: '400', mb: '', tags: 'website checks',
      note: 'code checks, no size of her own; 0.2 to 0.6 s per audit, counted as 0.4 s' },
    { id: 'lily', name: 'Lily', words: 'Makes the logo', group: 'flowers', colour: '#e65b56',
      role: 'end', in: ['facts', 'document', 'design'], out: ['image'], needs: ['documents'], unlessFed: { documents: 'document' }, lenses: { best: ['magnolia'] },
      status: 'design', params: '', ms: '', mb: '', tags: 'website documents',
      note: 'not built yet, no figures' },
    // Butterfly's insects (PLAN 2): all in design
    { id: 'butterfly', name: 'Butterfly', words: 'Leads the team', group: 'insects', colour: '#2fb39a',
      role: 'middle', in: ['text', 'request'], out: ['plan'], needs: ['brain'], takes: ['memory'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'cricket', name: 'Cricket', words: 'Asks first', group: 'insects', colour: '#3aa56f',
      role: 'reader', in: ['text'], out: ['request'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'bees', name: 'Bees', words: 'Write the code', group: 'insects', colour: '#f0a444',
      role: 'middle', in: ['plan', 'request', 'ranking'], out: ['code'], needs: ['brain'], takes: ['memory'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'ants', name: 'Ants', words: 'Tiny specialists', group: 'insects', colour: '#a0452e',
      role: 'middle', in: ['plan', 'request'], out: ['code'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'mantis', name: 'Mantis', words: 'Audits each piece', group: 'insects', colour: '#7fae3e',
      role: 'middle', in: ['code', 'spec'], out: ['findings'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'in design, no figures yet' },
    { id: 'ladybug', name: 'Ladybug', words: 'Hunts bugs', group: 'insects', colour: '#e65b56',
      role: 'middle', in: ['code', 'ranking'], out: ['findings'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'in design, no figures yet' },
    { id: 'cicada', name: 'Cicada', words: 'Keeps the memory', group: 'insects', colour: '#8a80cf',
      role: 'attachment', gives: 'memory',
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'dragonfly', name: 'Dragonfly', words: 'Searches by meaning', group: 'insects', colour: '#6592b4',
      role: 'middle', in: ['question', 'text', 'findings'], out: ['ranking'], needs: ['documents'], lenses: { best: ['magnolia'] },
      status: 'design', params: '', ms: '', mb: '', tags: 'code documents', note: 'in design, no figures yet' },
    { id: 'firefly', kind: 'code', name: 'Firefly', words: 'Calls for help', group: 'insects', colour: '#ec8e4a',
      role: 'end', in: ['findings'], out: ['message'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    // Siren's sea creatures (PLAN 3)
    { id: 'siren', name: 'Siren', words: 'Talks with you', group: 'sea', colour: '#2b7fd4',
      role: 'middle', hub: true, in: ['text', '*'], out: ['question', 'request', 'text'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'voice', note: 'designed, not built or measured yet' },
    // Attachments: brains, and your own data
    // Brains: each one LOCAL (on your PC) or REMOTE (a server you reach); pick the one you mean.
    { id: 'qwen27b', name: 'Qwen 27B', words: 'Local: on your PC, data stays here, 17.7 GB', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'brain', where: 'local', glyph: ['.X.X.', 'XXXXX', 'XHXHX', 'XXXXX', '.X.X.'],
      status: 'working', params: '27000', ms: '', mb: '17700', tags: 'brains',
      note: 'local: 27B class, 17.7 GB of weights on this PC, the engine Bouquet runs on today; its speed depends on your PC' },
    { id: 'qwen27b-remote', name: 'Qwen 27B remote', words: 'Remote: your cluster or a server; needs a connection; data leaves this PC unless the server is yours', group: 'attach', colour: '#4f6f8f',
      role: 'attachment', gives: 'brain', where: 'remote', glyph: ['.X.X.', 'XXXXX', 'XHXHX', 'XXXXX', 'H.H.H'],
      status: 'working', params: '27000', ms: '', mb: '0', tags: 'brains',
      note: 'remote: 27B class, no weights on this PC; speed not measured yet' },
    { id: 'glimmer', name: 'Muse Glimmer', words: 'Local: on your PC, data stays here; size not measured yet', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'brain', where: 'local', glyph: ['X.X.X', '.XHX.', 'XHHHX', '.XHX.', 'X.X.X'],
      status: 'working', params: '', ms: '', mb: '', tags: 'brains',
      note: 'local: a general model by Meta, not measured on this page yet' },
    { id: 'glimmer-remote', name: 'Muse Glimmer remote', words: 'Remote: your cluster or a server; needs a connection; data leaves this PC unless the server is yours', group: 'attach', colour: '#4f6f8f',
      role: 'attachment', gives: 'brain', where: 'remote', glyph: ['X.X.X', '.XHX.', 'XHHHX', '.XHX.', 'H.H.H'],
      status: 'working', params: '', ms: '', mb: '0', tags: 'brains',
      note: 'remote: a general model by Meta, no weights on this PC; not measured yet' },
    { id: 'database', kind: 'data', name: 'Database', words: 'Your own data', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'database', glyph: ['.XXX.', 'X...X', 'XHHHX', 'X...X', '.XXX.'],
      status: 'yours', params: '', ms: '', mb: '', tags: 'database',
      note: 'your own database (SQLite, PostgreSQL or MySQL), read only' },
    { id: 'plantables', kind: 'data', name: 'PLAN tables', words: 'PLAN\u2019s own tables, already understood', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'database', glyph: ['XXXXX', 'X.X.X', 'XXXXX', 'X.H.X', 'XXXXX'],
      status: 'yours', params: '', ms: '', mb: '', tags: 'database',
      note: 'the tables PLAN itself writes, whose names Daisy already knows' },
    { id: 'folder', kind: 'data', name: 'Documents', words: 'Your files', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'documents', glyph: ['XX...', 'XXXXX', 'X...X', 'X.H.X', 'XXXXX'],
      status: 'yours', params: '', ms: '', mb: '', tags: 'documents',
      note: 'a folder of your documents and spreadsheets, read only' },
    // Starts and ends Laurent named, not built yet
    { id: 'chat', kind: 'code', chat: true, name: 'Chat window', words: 'Where you type and read: a conversation starts and ends here', group: 'io', colour: '#3d8fd1',
      role: 'both', in: ['*'], out: ['text', 'question', 'request'], needs: [],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'voice code', note: 'code, not built yet' },
    { id: 'feeder', kind: 'code', name: 'Feeder', words: 'Feeds your documents (RAG)', group: 'io', colour: '#6a7480',
      role: 'reader', in: ['document'], out: ['document'], needs: [], startNeeds: ['documents'], glyph: ['X.X.X', '.....', 'XXXXX', '.XHX.', '..X..'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'documents', note: 'not built yet' },
    { id: 'scanner', name: 'Scanner', words: 'Reads paper and photos', group: 'io', colour: '#6a7480',
      role: 'start', in: [], out: ['document'], needs: [], glyph: ['XXXXX', 'X...X', 'HHHHH', 'X...X', 'XXXXX'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'documents', note: 'not built yet' },
    { id: 'api', kind: 'code', name: 'API', words: 'Sends the result to an API', group: 'io', colour: '#6a7480',
      role: 'end', in: ['*'], out: [], needs: [], glyph: ['X.H.X', '.X.X.', '..X..', '..X..', '.XXX.'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'code', note: 'not built yet' },
    { id: 'port', kind: 'code', name: 'Port', words: 'Broadcasts on a port', group: 'io', colour: '#6a7480',
      role: 'end', in: ['*'], out: [], needs: [], glyph: ['.X.X.', '.X.X.', 'XXXXX', '.XHX.', '..X..'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'code', note: 'not built yet' },
  ],
  // The three teams, one button each above the filters: each places one plan's tiles on the field,
  // in an order TesT accepts. Each tile is [id, column, row, attachments]; columns 0-7, rows 0-6.
  // PROPOSALS (2026-10-06), for Laurent to correct.
  presets: [
    { id: 'daisy', name: 'Daisy', plan: 'PLAN 1', colour: '#ec8e4a',
      say: 'PLAN 1: the owner talks in the Chat window, where Siren answers; Orchid and Tulip read the owner\u2019s files for Bouquet, who plans the site; Jasmine dresses it; Iris, Thistle and Lily finish it. MAGNOLIA, a lens, reads the database for Daisy, who answers the owner through Siren.',
      tiles: [
        ['magnolia', 2, 1], ['daisy', 3, 1, ['database']],
        ['chat', 2, 2], ['siren', 3, 2, ['qwen27b']], ['iris', 5, 2],
        ['orchid', 2, 3, ['folder']], ['bouquet', 3, 3, ['qwen27b']], ['jasmine', 4, 3], ['thistle', 5, 3],
        ['tulip', 2, 4, ['folder']], ['lily', 5, 4, ['folder']],
      ] },
    { id: 'butterfly', name: 'Butterfly', plan: 'PLAN 2', colour: '#2fb39a',
      say: 'PLAN 2: Cricket clarifies the request; Bouquet (or Butterfly) plans; Bees, Ants or Daisy (for SQL) write; Mantis audits; Dragonfly finds the suspect lines; Ladybug debugs; Firefly calls for help.',
      tiles: [
        ['bees', 2, 1, ['qwen27b']],
        ['cricket', 0, 2], ['bouquet', 1, 2, ['qwen27b']], ['ants', 2, 2], ['mantis', 3, 2, ['qwen27b']],
        ['dragonfly', 4, 2, ['folder']], ['ladybug', 5, 2, ['qwen27b']], ['firefly', 6, 2],
        ['butterfly', 1, 3, ['qwen27b', 'cicada']], ['daisy', 2, 3, ['database']], ['magnolia', 2, 4],
      ] },
    { id: 'siren', name: 'Siren', plan: 'PLAN 3', colour: '#2b7fd4',
      say: 'PLAN 3: the person talks in the Chat window; Siren, beside it, calls the specialists around her: Daisy (fed by Tulip), Orchid, and Bouquet, who with Dragonfly hands the work on to Bees, Mantis and Firefly.',
      tiles: [
        ['chat', 3, 2], ['dragonfly', 4, 2, ['folder']],
        ['tulip', 1, 3, ['folder']], ['daisy', 2, 3, ['database']], ['siren', 3, 3, ['qwen27b']],
        ['bouquet', 4, 3, ['glimmer']], ['bees', 5, 3, ['qwen27b']], ['mantis', 6, 3, ['qwen27b']], ['firefly', 7, 3],
        ['magnolia', 2, 4], ['orchid', 3, 4, ['folder']],
      ] },
  ],
};
