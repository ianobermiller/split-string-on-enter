'use babel';

const {CompositeDisposable, Range} = require('atom');

const SplitStringOnEnter = {
  config: {
    scopesToIgnore: {
      type: 'array',
      items: {type: 'string'},
      default: ['meta.tag.jsx'],
      title: 'Scopes to Ignore',
      description: 'Don\'t split the string when inside this scope.',
    },
    connector: {
      type: 'string',
      default: ' +',
      title: 'Concatenation String',
      description: 'When a string is split, this string will be appended to ' +
        'end of the original line. This is typically your language\'s string ' +
        'concatenation operator.',
    }
  },

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'split-string-on-enter:split',
        e => this.splitString(e)
      )
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  splitString(e) {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      event.abortKeyBinding();
      return;
    }

    if (editor.hasMultipleCursors()) {
      event.abortKeyBinding();
      return;
    }

    this.editor = editor;

    const bufferPosition = editor.getCursorBufferPosition();
    const line = editor.lineTextForBufferRow(bufferPosition.row);
    const isBeginningOfLine = bufferPosition.column === 0;
    const isEndOfLine = bufferPosition.column === line.length;
    const stringType = this.getStringTypeAtPosition(bufferPosition);
    const previousStringType = !isBeginningOfLine && this.getStringTypeAtPosition(
      {column: bufferPosition.column - 1, row: bufferPosition.row}
    );

    if (
      !stringType ||
      isBeginningOfLine ||
      isEndOfLine ||
      previousStringType !== stringType
    ) {
      event.abortKeyBinding();
      return;
    }

    const scopesToIgnore = this.getConfig('scopesToIgnore');

    const scopes = this.getScopesAtPos(bufferPosition);
    if (scopes.some(s => scopesToIgnore.indexOf(s) !== -1)) {
      event.abortKeyBinding();
      return;
    }

    const connector = this.getConnector(scopes);
    const leadingSpace = line.match(/^\s*/)[0];

    if (stringType === 'single') {
      editor.insertText('\'' + connector + '\n' + leadingSpace + '\'');
    } else {
      editor.insertText('"' + connector + '\n' + leadingSpace + '"');
    }
  },

  getConfig(name) {
    return atom.config.get(
      'split-string-on-enter.' + name,
      {scope: this.editor.getLastCursor().getScopeDescriptor()},
    );
  },

  getConnector(scopes) {
    let connector = this.getConfig('connector');

    // So everyone doesn't have to add this to their config.cson:
    // ".hack.source":
    //   "split-string-on-enter":
    //     connector: "."
    const isDefault = connector === this.config.connector.default;
    const scopesWithDot = ['source.hack', 'source.php'];
    if (isDefault && scopes.some(s => scopesWithDot.indexOf(s) !== -1)) {
      connector = '.';
    }

    return connector;
  },

  getScopesAtPos(pos) {
    return this.editor.scopeDescriptorForBufferPosition(pos).getScopesArray();
  },

  getStringTypeAtPosition(pos) {
    const scopes = this.getScopesAtPos(pos);
    if (scopes.some(s => s.startsWith('string.quoted.single'))) {
      return 'single';
    }
    if (scopes.some(s => s.startsWith('string.quoted.double'))) {
      return 'double';
    }
    return null;
  }
};

module.exports = SplitStringOnEnter;
