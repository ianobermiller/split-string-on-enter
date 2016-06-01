/* @flow */

'use babel';

const {CompositeDisposable, Range} = require('atom');

type BufferPosition = {
  column: number,
  row: number,
};

const SplitStringOnEnter = {
  config: {
  connector: {
    type: 'string',
    default: ' +',
    title: 'Concatenation String',
    description: 'When a string is split, this string will be appended to ' +
      'end of the original line. This is typically your language\'s string ' +
      'concatenation operator.',
    },
    scopesToIgnore: {
      type: 'array',
      items: {type: 'string'},
      default: ['source.json'],
      title: 'Scopes to Ignore',
      description: 'Don\'t split the string when inside any of these scopes.',
    },
  },

  activate(state: {}) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'split-string-on-enter:split',
        event => this.splitString(event)
      )
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  splitString(event: {abortKeyBinding: () => void}) {
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

    const scopes = this.getScopesAtPos(bufferPosition);
    if (this.shouldIgnoreScope(scopes)) {
      event.abortKeyBinding();
      return;
    }

    const connector = this.getConnector(scopes);
    const match = line.match(/^\s*/);
    const leadingSpace = match ? match[0] : '';

    if (stringType === 'single') {
      editor.insertText('\'' + connector + '\n' + leadingSpace + '\'');
    } else {
      editor.insertText('"' + connector + '\n' + leadingSpace + '"');
    }
  },

  getConfig(name: string) {
    return atom.config.get(
      'split-string-on-enter.' + name,
      {scope: this.editor.getLastCursor().getScopeDescriptor()},
    );
  },

  shouldIgnoreScope(scopes: Array<string>) {
    const scopesToIgnore = this.getConfig('scopesToIgnore');
    console.log('scopesToIgnore', scopesToIgnore, scopes);
    if (scopes.some(s => scopesToIgnore.indexOf(s) !== -1)) {
      return true;
    }

    // These are harder to express in the simple `scopeToIgnore` config, since
    // you can have normal JavaScript nested within a JSX tag. We don't want to
    // concat within JSX string attributes, like className="foo". So bail if
    // the last attribute scope is greater than the last source-like scope.
    // This is far from foolproof, and will still cause issues with components
    // nested within other component props.

    // "Babel ES6 JavaScript" language
    if (scopes.lastIndexOf('meta.tag.jsx') > scopes.lastIndexOf('source.js.jsx')) {
      return true;
    }

    // "JavaScript with JSX" language
    if (scopes.lastIndexOf('meta.tag.block.begin.jsx') > scopes.lastIndexOf('source.js.jsx')) {
      return true;
    }

    // "JavaScript (JSX)" language
    if (scopes.lastIndexOf('tag.open.js') > scopes.lastIndexOf('meta.brace.curly.js')) {
      return true;
    }

    return false;
  },

  getConnector(scopes: Array<string>) {
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

  getScopesAtPos(pos: BufferPosition) {
    return this.editor.scopeDescriptorForBufferPosition(pos).getScopesArray();
  },

  getStringTypeAtPosition(pos: BufferPosition) {
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
