{CompositeDisposable, Range} = require 'atom'

module.exports = SplitStringOnEnter =
  config:
    connector:
      type: 'string'
      default: ' +'
      title: 'Concatenation String'
      description: 'When a string is split, this string will be appended to ' +
        'end of the original line. This is typically your language\'s string ' +
        'concatenation operator.'

  subscriptions: null

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add(atom.commands.add('atom-workspace', 'split-string-on-enter:split', (e) => @splitString(e)))

  deactivate: ->
    @subscriptions.dispose()

  splitString: (e) ->
    if !(editor = atom.workspace.getActiveTextEditor())
      event.abortKeyBinding()

    if editor.hasMultipleCursors()
      event.abortKeyBinding()

    bufferPosition = editor.getCursorBufferPosition()
    line = editor.lineTextForBufferRow(bufferPosition.row)
    isBeginningOfLine = bufferPosition.column == 0
    isEndOfLine = bufferPosition.column == line.length
    stringType = getStringTypeAtPosition(editor, bufferPosition)
    previousStringType = !isBeginningOfLine && getStringTypeAtPosition(
      editor,
      {column: bufferPosition.column - 1, row: bufferPosition.row}
    )

    if stringType && !isBeginningOfLine && !isEndOfLine && previousStringType == stringType
      connector = atom.config.get(
        'split-string-on-enter.connector',
        scope: editor.getLastCursor().getScopeDescriptor()
      )
      leadingSpace = line.match(/^\s*/)[0];
      if stringType == 'single'
        editor.insertText('\'' + connector + '\n' + leadingSpace + '\'')
      else
        editor.insertText('"' + connector + '\n' + leadingSpace + '"')
    else
      event.abortKeyBinding()

getStringTypeAtPosition = (editor, pos) ->
  scopes = editor.scopeDescriptorForBufferPosition(pos).getScopesArray()
  return 'single' if scopes.some((s) -> s.startsWith('string.quoted.single'))
  return 'double' if scopes.some((s) -> s.startsWith('string.quoted.double'))
