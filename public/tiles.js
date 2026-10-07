/* THE TILES OF THE WORKBENCH: the one place that says what every tile is.

   workbench.js builds the panel of tiles from this file (on workbench.html and on the home page),
   marks each tile's ROLE with a lettered badge (I, Fn, O), and its TesT key checks a team against these rules. Edit a tile
   here and both pages follow; nothing about a tile is written anywhere else.

   role      start      an input: a way data or a request comes in (a chat, a feeder, a file upload, a
                        scanner, an inbox); only an input can begin a chain. A model that READS what an
                        input brings (Orchid, Tulip, Cricket) is a function, never an input (Laurent,
                        2026-10-07: "orchid on its own can do nothing. it reads a rag folder, or an upload")
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
             (skills    a SKILL is an attachment that "gives: 'skill'" and docks only onto the models it
                        "serves"; it goes in the Skills section)
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
   fallback  a need met by something built in when nothing is attached: { database: { say, as } } (Daisy
             "needs to know the tables": a Database attached, else the built-in SAMPLE of PLAN's tables, or
             tables pasted in the chat when you try her). TesT passes with a note saying which; "as" is the
             attachment the fallback counts as for her lens rule (the sample is PLAN tables)
   needsSay  how a need reads in a tile's profile, when it is not just its name ({ database: '...' })
   tryit     the Text output: the end of a chain a visitor can TRY for real (Chat window, Daisy, Text output):
             workbench.js shows a Try it key, which opens a chat whose answers come from Daisy on our
             machine, asked through a ticket the sign-in gives for each request (gate.php ?ticket)
   unlessFed a need waived when the tile before it brings that kind ({ documents: 'document' }: Lily needs
             no folder when a Feeder or a Scanner hands her documents)
   brain     a brain is the TEAM's: one brain attached to any tile serves every tile of the connected team
             that needs one; a brain attached straight onto a tile is that tile's own (an override)
   reads     on a function that reads what an input brings: { after: the inputs to put before it, pron }.
             TesT refuses a chain that begins with it, naming those inputs, and says what it reads
   word      the one word a tile's ghost shows on the field (what it adds next)
   status    working (built, figures measured) | design (designed, not built) | notbuilt (named by
             Laurent, not designed yet) | yours (your own data: no figures of its own)
   params, ms, mb   millions of parameters, milliseconds per call, megabytes on disk; "" when there
             is no measurement. Never estimated.
   glyph     only for tiles with no pixel icon in the page's sprite: a 5 x 5 drawing in the logo's
             pixels (X white, H gold), as tools/make_pixel_icons.py draws the others.
   writesCode  a function that writes code, and in which language ('SQL', 'Python', or 'code' when it is not
             fixed): a team of two or more of them with no Checker gets a warning from TesT
   checker   the Checker: after a team, it runs every part against the brain's contract
   pixels    for a code tile (a way in or out): its own drawing, rows of X, in the code look (the tile's
             colour on dark, no square), instead of "</>"

   Every role, kind and need below is a PROPOSAL (2026-10-06) for Laurent to correct. */
// Orchid and Tulip read documents: whatever input brings them (Feeder, File upload, Scanner, E-mail inbox, Web page)
const READS_DOCS = { after: 'a Folder (Feeder), a File upload or another input', pron: 'she' };
window.AKIKI_TILES = {
  roles: {
    start: { label: 'input', say: 'starts a chain' },
    middle: { label: 'function', say: 'works in the middle of a chain' },
    end: { label: 'output', say: 'gives the result at the end of a chain' },
    both: { label: 'input + output', say: 'starts a chain and gives its result' },
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
  needs: { brain: 'a brain', database: 'a database', documents: 'a documents folder', memory: 'a memory', skill: 'a skill' },
  // What a tile gets on its own when it is put on the field (workbench.js, "Defaults"): a tile that needs a
  // brain, in a team with none yet, gets this one (local, so nothing leaves the PC). Laurent, 2026-10-07:
  // "When putting bouquet or another large model tile, put 27B with it by default".
  defaultBrain: 'qwen27b',
  // The panel is ordered by what a tile is FOR (workbench.js puts each tile in its section from its
  // role); "group" says which plan a tile comes from (no longer shown under the tile, 2026-10-07).
  sections: [
    { id: 'starters', head: 'Inputs' }, { id: 'functions', head: 'Functions' }, { id: 'outputs', head: 'Outputs' },
    { id: 'lenses', head: 'Lens & add-ons' }, { id: 'skills', head: 'Skills' }, { id: 'brains', head: 'Brains' }, { id: 'data', head: 'Data' },
  ],
  plans: { flowers: 'PLAN 1', insects: 'PLAN 2', sea: 'PLAN 3' },
  tiles: [
    // Daisy's flowers (PLAN)
    { id: 'bouquet', word: 'plan', name: 'Bouquet', words: 'Plans the work', group: 'flowers', colour: '#35adb0',
      role: 'middle', in: ['text', 'request', 'facts', 'document', 'table'], out: ['plan'], needs: ['brain'], lenses: { best: ['magnolia'] },
      status: 'working', params: '', ms: '24500', mb: '', tags: 'website',
      note: 'a planning prompt and its checker on the brain you attach; 17 to 32 s per call on the 27B, counted as 24.5 s' },
    { id: 'orchid', word: 'facts', name: 'Orchid', words: 'Finds the facts', group: 'flowers', colour: '#c2549e',
      role: 'middle', in: ['document'], out: ['facts'], needs: [], reads: READS_DOCS, lenses: { best: ['magnolia'] },
      status: 'working', params: '32.8', ms: '77', mb: '131', tags: 'documents',
      note: '32.8M parameters, 131 MB, 77 ms per chunk' },
    { id: 'tulip', word: 'table', name: 'Tulip', words: 'Imports spreadsheets', group: 'flowers', colour: '#3aa56f',
      role: 'middle', in: ['document'], out: ['table'], needs: [], reads: READS_DOCS, lenses: { best: ['magnolia'] }, writesCode: 'Python',
      status: 'working', params: '61.6', ms: '120', mb: '', tags: 'database documents',
      note: '61.6M parameters, 0.12 s per sheet' },
    { id: 'jasmine', word: 'design', kind: 'hybrid', name: 'Jasmine', words: 'Dresses the site', group: 'flowers', colour: '#a06fc2',
      role: 'middle', in: ['facts', 'plan'], out: ['design'], needs: [], lenses: { best: ['magnolia'] },
      status: 'working', params: '3.4', ms: '9', mb: '13.5', tags: 'website',
      note: '3.4M parameters, 13.5 MB; about 9 ms per design, measured on a network her size' },
    { id: 'daisy', word: 'answer', name: 'Daisy', words: 'Answers questions', group: 'flowers', colour: '#ec8e4a',
      role: 'middle', in: ['question', 'reading', 'table', 'plan'], out: ['table', 'spec'], needs: ['database'], writesCode: 'SQL',
      needsSay: { database: 'to know the tables (a Database, the built-in sample of PLAN\u2019s tables, or tables pasted in the chat)' },
      fallback: { database: { say: 'the built-in sample of PLAN\u2019s tables (a made-up salon); attach a Database, or paste tables in the chat when you try her', as: 'plantables' } },
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
    { id: 'iris', word: 'watch', kind: 'hybrid', name: 'Iris', words: 'Watches live sites', group: 'flowers', colour: '#7c8acb',
      role: 'end', in: ['design'], out: ['findings'], needs: [],
      status: 'working', params: '3.4', ms: '14', mb: '', tags: 'website checks',
      note: '3.4M parameters, 14 ms per page' },
    { id: 'thistle', word: 'guard', kind: 'code', name: 'Thistle', words: 'Guards the site', group: 'flowers', colour: '#94549f',
      role: 'end', in: ['design', 'code'], out: ['findings'], needs: [],
      status: 'working', params: '', ms: '400', mb: '', tags: 'website checks',
      note: 'code checks, no size of her own; 0.2 to 0.6 s per audit, counted as 0.4 s' },
    { id: 'lily', word: 'image', name: 'Lily', words: 'Makes the logo', group: 'flowers', colour: '#e65b56',
      role: 'end', in: ['facts', 'document', 'design'], out: ['image'], needs: ['documents'], unlessFed: { documents: 'document' }, lenses: { best: ['magnolia'] },
      status: 'design', params: '', ms: '', mb: '', tags: 'website documents',
      note: 'not built yet, no figures' },
    // Butterfly's insects (PLAN 2): all in design
    { id: 'butterfly', word: 'lead', name: 'Butterfly', words: 'Leads the team', group: 'insects', colour: '#2fb39a',
      role: 'middle', in: ['text', 'request'], out: ['plan'], needs: ['brain'], takes: ['memory'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'cricket', word: 'clarify', name: 'Cricket', words: 'Asks first', group: 'insects', colour: '#3aa56f',
      role: 'middle', in: ['text'], out: ['request'], needs: [], reads: { after: 'a Chat window, a Messaging app or a Microphone', pron: 'it' },
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'bees', word: 'code', name: 'Bees', words: 'Write the code', group: 'insects', colour: '#f0a444',
      role: 'middle', in: ['plan', 'request', 'ranking'], out: ['code'], needs: ['brain'], takes: ['memory'], writesCode: 'code',
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'ants', word: 'code', name: 'Ants', words: 'Tiny specialists', group: 'insects', colour: '#a0452e',
      role: 'middle', in: ['plan', 'request'], out: ['code'], needs: [], writesCode: 'code',
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'mantis', word: 'audit', name: 'Mantis', words: 'Audits each piece', group: 'insects', colour: '#7fae3e',
      role: 'middle', in: ['code', 'spec'], out: ['findings'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'in design, no figures yet' },
    { id: 'ladybug', word: 'debug', name: 'Ladybug', words: 'Hunts bugs', group: 'insects', colour: '#e65b56',
      role: 'middle', in: ['code', 'ranking'], out: ['findings'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'in design, no figures yet' },
    // SKILLS: a small specialist a model retrains on the fly. "serves" lists ONLY the models where a skill
    // passed its measured test on held-out material (Orchid, Iris, Daisy); Tulip and MAGNOLIA showed no proven
    // gain, so they get none. A served model gets the skill on its own when it is placed (Laurent, 2026-10-07).
    { id: 'skill', name: 'Skill', words: 'A small specialist the model retrains on the fly', group: 'attach', colour: '#8a5cc8',
      role: 'attachment', gives: 'skill', serves: ['orchid', 'iris', 'daisy'], glyph: ['..X..', '.XHX.', 'XHHHX', '.XHX.', '..X..'],
      status: 'gate', params: '', ms: '', mb: '', tags: 'lenses',
      note: 'measured gain on held-out tests, not yet in use' },
    { id: 'cicada', name: 'Cicada', words: 'Keeps the memory', group: 'insects', colour: '#8a80cf',
      role: 'attachment', gives: 'memory',
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    { id: 'dragonfly', word: 'search', name: 'Dragonfly', words: 'Searches by meaning', group: 'insects', colour: '#6592b4',
      role: 'middle', in: ['question', 'text', 'findings'], out: ['ranking'], needs: ['documents'], lenses: { best: ['magnolia'] },
      status: 'design', params: '', ms: '', mb: '', tags: 'code documents', note: 'in design, no figures yet' },
    { id: 'firefly', word: 'help', kind: 'code', name: 'Firefly', words: 'Calls for help', group: 'insects', colour: '#ec8e4a',
      role: 'end', in: ['findings'], out: ['message'], needs: [],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'in design, no figures yet' },
    // Siren's sea creatures (PLAN 3)
    { id: 'siren', word: 'talk', name: 'Siren', words: 'Talks with you', group: 'sea', colour: '#2b7fd4',
      role: 'middle', hub: true, in: ['text', '*'], out: ['question', 'request', 'text'], needs: ['brain'],
      status: 'design', params: '', ms: '', mb: '', tags: 'voice', note: 'designed, not built or measured yet' },
    // The Checker (Laurent approved, 2026-10-07): with functions stacked as a team, the brain writes a blueprint
    // and a CONTRACT (tables, endpoints, names, formats, who does what); each function builds its part to it;
    // the Checker then runs the parts against the contract (the SQL on the contract's tables, the Python in
    // the contract's format, the page calling exactly those endpoints, one test end to end). On a pass the
    // brain assembles one answer, each part labelled; on a fail it sends a fix order to the one function at
    // fault, at most three rounds, then says plainly that it failed. Code, not a model: Mantis audits a piece
    // with a brain; the Checker runs them.
    { id: 'contract-check', word: 'check', kind: 'code', name: 'Checker', words: 'Runs every part against the brain\u2019s contract', group: 'io', colour: '#b9862f',
      role: 'middle', checker: true, in: ['code', 'spec', 'table', 'plan', 'facts', 'design'], out: ['code', 'spec', 'table', 'findings'], needs: [],
      pixels: ['XXXXXXXXX', 'X.......X', 'X.....X.X', 'X....X..X', 'X.X.X...X', 'X..X....X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code checks', note: 'designed, not built yet' },
    // Attachments: brains, and your own data
    // Brains: each one LOCAL (on your PC) or REMOTE (a server you reach); pick the one you mean.
    { id: 'qwen27b', name: 'Qwen 27B', words: 'Local: on your PC, data stays here, 17.7 GB', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'brain', where: 'local', glyph: ['.X.X.', 'XXXXX', 'XHXHX', 'XXXXX', '.X.X.'],
      status: 'working', params: '27000', ms: '', mb: '17700', tags: 'brains',
      note: 'local: 27B class, 17.7 GB of weights on this PC, the engine Bouquet runs on today; its speed depends on your PC; tiles sharing one brain take turns on it, so answers can be slower' },
    { id: 'qwen27b-remote', name: 'Qwen 27B remote', words: 'Remote: your cluster or a server; needs a connection; data leaves this PC unless the server is yours', group: 'attach', colour: '#4f6f8f',
      role: 'attachment', gives: 'brain', where: 'remote', glyph: ['.X.X.', 'XXXXX', 'XHXHX', 'XXXXX', 'H.H.H'],
      status: 'working', params: '27000', ms: '', mb: '0', tags: 'brains',
      note: 'remote: 27B class, no weights on this PC; speed not measured yet; tiles sharing one brain take turns on it, so answers can be slower' },
    { id: 'glimmer', name: 'Muse Glimmer', words: 'Local: on your PC, data stays here; size not measured yet', group: 'attach', colour: '#5f6b7a',
      role: 'attachment', gives: 'brain', where: 'local', glyph: ['X.X.X', '.XHX.', 'XHHHX', '.XHX.', 'X.X.X'],
      status: 'working', params: '', ms: '', mb: '', tags: 'brains',
      note: 'local: a general model by Meta, not measured on this page yet; tiles sharing one brain take turns on it, so answers can be slower' },
    { id: 'glimmer-remote', name: 'Muse Glimmer remote', words: 'Remote: your cluster or a server; needs a connection; data leaves this PC unless the server is yours', group: 'attach', colour: '#4f6f8f',
      role: 'attachment', gives: 'brain', where: 'remote', glyph: ['X.X.X', '.XHX.', 'XHHHX', '.XHX.', 'H.H.H'],
      status: 'working', params: '', ms: '', mb: '0', tags: 'brains',
      note: 'remote: a general model by Meta, no weights on this PC; not measured yet; tiles sharing one brain take turns on it, so answers can be slower' },
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
    // Ways in and ways out (Laurent, 2026-10-07: "make sure there are code based tiles for each of those
    // available"): the usual input methods, then the usual output methods, in his order. Each is code, and
    // only designed: none of these connectors is built yet. The Chat window is the chat box both ways, the
    // Feeder the folder or knowledge base (RAG), the API the API response or webhook call. A way out takes
    // any result, as the API does; TesT refuses any input straight into any output (a Function goes between).
    { id: 'scanner', word: 'scan', name: 'Scanner', words: 'Reads paper and photos', group: 'io', colour: '#6a7480',
      role: 'start', in: [], out: ['document'], needs: [], glyph: ['XXXXX', 'X...X', 'HHHHH', 'X...X', 'XXXXX'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'documents', note: 'not built yet' },
    { id: 'chat', word: 'chat', kind: 'code', chat: true, name: 'Chat window', words: 'Where you type and read: a conversation starts and ends here', group: 'io', colour: '#3d8fd1',
      role: 'both', in: ['*'], out: ['text', 'question', 'request'], needs: [],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'voice code', note: 'code, not built yet' },
    { id: 'voice-in', word: 'hear', kind: 'code', name: 'Microphone', words: 'Turns your voice into text', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['text', 'question'], needs: [], pixels: ['...XXX...', '...XXX...', '...XXX...', '.X.XXX.X.', '.X.....X.', '..XXXXX..', '....X....', '..XXXXX..'],
      status: 'design', params: '', ms: '', mb: '', tags: 'voice code', note: 'designed, not built yet' },
    { id: 'upload', word: 'upload', kind: 'code', name: 'File upload', words: 'Takes a file you upload: PDF, Word, spreadsheet, picture', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['document', 'image'], needs: [], pixels: ['....X....', '...XXX...', '..X.X.X..', '....X....', '....X....', 'X.......X', 'X.......X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'documents code', note: 'designed, not built yet' },
    { id: 'feeder', word: 'feed', kind: 'code', name: 'Feeder', words: 'Feeds your documents (RAG)', group: 'io', colour: '#6a7480',
      role: 'start', in: [], out: ['document'], needs: ['documents'], glyph: ['X.X.X', '.....', 'XXXXX', '.XHX.', '..X..'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'documents', note: 'not built yet' },
    { id: 'webhook', word: 'webhook', kind: 'code', name: 'Webhook', words: 'An API call or webhook starts the work', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['request', 'text'], needs: [], pixels: ['.X...X.', '.X...X.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '...X...'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'db-in', word: 'connect', kind: 'code', name: 'Database connection', words: 'Reads from a database it connects to', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['reading'], needs: [], pixels: ['.XXXXX.', 'X.....X', '.XXXXX.', 'X.....X', 'X.....X', '.XXXXX.', 'X.....X', '.XXXXX.'],
      status: 'design', params: '', ms: '', mb: '', tags: 'database code', note: 'designed, not built yet' },
    { id: 'web-in', word: 'browse', kind: 'code', name: 'Web page', words: 'Reads a web page, a URL or a web search', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['document', 'text'], needs: [], pixels: ['..XXXXX..', '.X..X..X.', 'X..X.X..X', 'XXXXXXXXX', 'X..X.X..X', '.X..X..X.', '..XXXXX..'],
      status: 'design', params: '', ms: '', mb: '', tags: 'website code', note: 'designed, not built yet' },
    { id: 'mail-in', word: 'inbox', kind: 'code', name: 'E-mail inbox', words: 'Reads the e-mails that arrive', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['document', 'text', 'question'], needs: [], pixels: ['XXXXXXXXX', 'XX.....XX', 'X.X...X.X', 'X..X.X..X', 'X...X...X', 'X.......X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'msg-in', word: 'message', kind: 'code', name: 'Messaging apps', words: 'Reads messages: WhatsApp, Slack, Teams, Telegram', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['text', 'question', 'request'], needs: [], pixels: ['.XXXXXXX.', 'X.......X', 'X.X.X.X.X', 'X.......X', '.XXXXXXX.', '..X......', '.X.......'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'camera', word: 'see', kind: 'code', name: 'Camera', words: 'Takes in images and video', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['image'], needs: [], pixels: ['..XXX....', 'XXXXXXXXX', 'X..XXX..X', 'X.X...X.X', 'X.X...X.X', 'X..XXX..X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'sensors', word: 'sense', kind: 'code', name: 'Sensors', words: 'Reads sensors and devices', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['text'], needs: [], pixels: ['.X.X.X.', 'XXXXXXX', '.X...X.', 'XX.X.XX', '.X...X.', 'XXXXXXX', '.X.X.X.'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'schedule', word: 'trigger', kind: 'code', name: 'Schedule', words: 'Starts the work on a timer or an event, such as a form sent', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['request'], needs: [], pixels: ['..XXXXX..', '.X..X..X.', 'X...X...X', 'X...XXX.X', 'X.......X', '.X.....X.', '..XXXXX..'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'webform', word: 'form', kind: 'code', name: 'Web form', words: 'Takes what someone fills in on a web form', group: 'io', colour: '#4a86c8',
      role: 'start', in: [], out: ['text', 'request'], needs: [], pixels: ['XXXXXXXXX', 'X.......X', 'X.XXXXX.X', 'X.......X', 'X.XXXXX.X', 'X.......X', 'XXXXXXXXX', '......XXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'website code', note: 'designed, not built yet' },
    { id: 'text-out', word: 'text', kind: 'code', tryit: true, name: 'Text output', words: 'Shows the answer as text: what the model wrote, its code and its result', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['XXXXXXXXX', 'X.......X', 'X.XX.XX.X', 'X.......X', 'X.XXXX..X', 'X.......X', 'X.XX....X', 'XXXXXXXXX'],
      status: 'working', params: '', ms: '', mb: '', tags: 'code', note: 'code: a chat screen that shows the reply as text (after Daisy: her spec, the SQL, and rows on the sample)' },
    { id: 'speech', word: 'speak', kind: 'code', name: 'Speech', words: 'Reads the result aloud', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['....X..X.', '...XX...X', '.XXXX.X.X', '.XXXX.X.X', '.XXXX.X.X', '...XX...X', '....X..X.'],
      status: 'design', params: '', ms: '', mb: '', tags: 'voice code', note: 'designed, not built yet' },
    { id: 'file-out', word: 'file', kind: 'code', name: 'Generated file', words: 'Makes a file: PDF, Word, Excel, PowerPoint, image', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['XXXXX..', 'X...XX.', 'X...XXX', 'X.....X', 'X.XXX.X', 'X.....X', 'X.XXX.X', 'XXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'documents code', note: 'designed, not built yet' },
    { id: 'save-folder', word: 'save', kind: 'code', name: 'Save to folder', words: 'Saves the result to a folder or a knowledge base', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['XXX......', 'X..XXXXXX', 'X.......X', 'X...X...X', 'X...X...X', 'X.XXXXX.X', 'X..XXX..X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'documents code', note: 'designed, not built yet' },
    { id: 'api', word: 'send', kind: 'code', name: 'API', words: 'Sends the result to an API', group: 'io', colour: '#6a7480',
      role: 'end', in: ['*'], out: [], needs: [], glyph: ['X.H.X', '.X.X.', '..X..', '..X..', '.XXX.'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'code', note: 'not built yet' },
    { id: 'db-out', word: 'write', kind: 'code', name: 'Write to database', words: 'Writes the result into a database', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['.XXXXX..', 'X.....X.', '.XXXXX..', 'X.....X.', 'X.....X.X', 'X.....XXX', '.XXXXX.X.', '........'],
      status: 'design', params: '', ms: '', mb: '', tags: 'database code', note: 'designed, not built yet' },
    { id: 'web-out', word: 'publish', kind: 'code', name: 'Published page', words: 'Publishes the result as a web page', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['XXXXXXXXX', 'X.X.X...X', 'XXXXXXXXX', 'X.......X', 'X.XXX.X.X', 'X.......X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'website code', note: 'designed, not built yet' },
    { id: 'mail-out', word: 'mail', kind: 'code', name: 'E-mail sent', words: 'Sends the result by e-mail', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['........X', '......XX.', '....XX.X.', '..XX..X..', 'XXXXXX...', '...XX....', '...X.....'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'msg-out', word: 'reply', kind: 'code', name: 'Message to an app', words: 'Sends the result as a message in an app', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['.XXXXXXX.', 'X.......X', 'X.XXXXX.X', 'X.......X', '.XXXXXXX.', '......X..', '.......X.'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'dashboard', word: 'chart', kind: 'code', name: 'Dashboard', words: 'Shows the result as a dashboard, a chart or a report', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['X........', 'X.....XX.', 'X..XX.XX.', 'X..XX.XX.', 'XX.XX.XX.', 'XX.XX.XX.', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'notify', word: 'alert', kind: 'code', name: 'Notification', words: 'Sends a notification or an alert', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['....X....', '..XXXXX..', '.X.....X.', '.X.....X.', '.X.....X.', 'XXXXXXXXX', '...XXX...'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'app-action', word: 'act', kind: 'code', name: 'Action in an app', words: 'Does something in another app: a ticket, a meeting', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['XXXXXXXXX', 'X.......X', 'X......XX', 'X.X...X.X', 'X..X.X..X', 'X...X...X', 'XXXXXXXXX'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'device', word: 'command', kind: 'code', name: 'Device command', words: 'Sends a command to a device or a robot', group: 'io', colour: '#2f9a94',
      role: 'end', in: ['*'], out: [], needs: [], pixels: ['....X....', '..XXXXX..', '.X.....X.', '.X.X.X.X.', '.X.....X.', '.XXXXXXX.', 'X.X...X.X'],
      status: 'design', params: '', ms: '', mb: '', tags: 'code', note: 'designed, not built yet' },
    { id: 'port', word: 'broadcast', kind: 'code', name: 'Port', words: 'Broadcasts on a port', group: 'io', colour: '#6a7480',
      role: 'end', in: ['*'], out: [], needs: [], glyph: ['.X.X.', '.X.X.', 'XXXXX', '.XHX.', '..X..'],
      status: 'notbuilt', params: '', ms: '', mb: '', tags: 'code', note: 'not built yet' },
  ],
  // The three teams, one button each above the filters: each places one plan's tiles on the field,
  // in an order TesT accepts. Each tile is [id, column, row, attachments]; columns 0-7, rows 0-6.
  // PROPOSALS (2026-10-06), for Laurent to correct.
  presets: [
    { id: 'daisy', name: 'Daisy', plan: 'PLAN 1', colour: '#ec8e4a',
      say: 'PLAN 1: the owner talks in the Chat window, where Siren answers; the Feeder brings the owner\u2019s files, which Orchid and Tulip, coordinated by the brain, read for Bouquet, who plans the site; Jasmine dresses it; Iris, Thistle and Lily, coordinated by the brain, finish it. MAGNOLIA, a lens, reads the database for Daisy, who answers the owner through Siren.',
      tiles: [
        ['magnolia', 2, 1], ['daisy', 3, 1, ['database']],
        ['chat', 2, 2], ['siren', 3, 2], ['iris', 5, 2],
        ['feeder', 1, 3, ['folder']], ['orchid', 2, 3], ['bouquet', 3, 3, ['qwen27b']], ['jasmine', 4, 3], ['thistle', 5, 3],
        ['tulip', 2, 4], ['lily', 5, 4, ['folder']],
      ] },
    { id: 'butterfly', name: 'Butterfly', plan: 'PLAN 2', colour: '#2fb39a',
      say: 'PLAN 2: the request arrives in the Chat window and Cricket clarifies it; Bouquet and Butterfly, coordinated by the brain, plan; Bees, Ants and Daisy (for SQL), coordinated by the brain, write; Mantis audits; Dragonfly and Ladybug, coordinated by the brain, find the suspect lines and debug them; Firefly calls for help.',
      tiles: [
        ['bees', 3, 1],
        ['chat', 0, 2], ['cricket', 1, 2], ['bouquet', 2, 2, ['qwen27b']], ['ants', 3, 2], ['mantis', 4, 2],
        ['dragonfly', 5, 2, ['folder']], ['firefly', 6, 2],
        ['butterfly', 2, 3, ['cicada']], ['daisy', 3, 3, ['database']], ['ladybug', 5, 3], ['magnolia', 3, 4],
      ] },
    { id: 'siren', name: 'Siren', plan: 'PLAN 3', colour: '#2b7fd4',
      say: 'PLAN 3: the person talks in the Chat window; Siren, beside it, calls the specialists around her: Orchid, who reads the files the Feeder brings; Daisy, fed by Tulip, who reads an uploaded spreadsheet; and Bouquet, who hands the work on to Dragonfly and Bees, coordinated by the brain, then to Mantis and Firefly.',
      tiles: [
        ['feeder', 2, 2, ['folder']], ['orchid', 3, 2], ['dragonfly', 5, 2, ['folder']],
        ['chat', 2, 3], ['siren', 3, 3, ['qwen27b']], ['bouquet', 4, 3], ['bees', 5, 3], ['mantis', 6, 3], ['firefly', 7, 3],
        ['upload', 1, 4], ['tulip', 2, 4], ['daisy', 3, 4, ['database']],
        ['magnolia', 3, 5],
      ] },
  ],
};
