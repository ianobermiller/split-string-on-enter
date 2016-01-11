{CompositeDisposable, Range} = require 'atom'

module.exports = SplitStringOnEnter =
  config:
    scopesToIgnore:
      type: 'array'
      items:
        type: 'string'
      default: ['meta.tag.jsx']
      title: 'Scopes to Ignore'
      description: 'Don\'t split the string when inside this scope.'
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
      return

    if editor.hasMultipleCursors()
      event.abortKeyBinding()
      return

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

      scopesToIgnore = atom.config.get(
        'split-string-on-enter.scopesToIgnore',
        scope: editor.getLastCursor().getScopeDescriptor()
      )

      scopes = getScopesAtPos(editor, bufferPosition)
      if scopes.some((s) -> scopesToIgnore.indexOf(s) != -1)
        event.abortKeyBinding()
        return

      connector = @getConnector(editor, scopes)

      leadingSpace = line.match(/^\s*/)[0];
      if stringType == 'single'
        editor.insertText('\'' + connector + '\n' + leadingSpace + '\'')
      else
        editor.insertText('"' + connector + '\n' + leadingSpace + '"')
    else
      event.abortKeyBinding()

  getConnector: (editor, scopes) ->
    connector = atom.config.get(
      'split-string-on-enter.connector',
      scope: editor.getLastCursor().getScopeDescriptor()
    )

    # So everyone doesn't have to add this to their config.cson:
    # ".hack.source":
    #   "split-string-on-enter":
    #     connector: "."
    isDefault = connector == @config.connector.default
    scopesWithDot = ['source.hack', 'source.php']
    if isDefault && scopes.some((s) -> scopesWithDot.indexOf(s) != -1)
      connector = '.'

    connector

getScopesAtPos = (editor, pos) ->
  editor.scopeDescriptorForBufferPosition(pos).getScopesArray()

getStringTypeAtPosition = (editor, pos) ->
  scopes = getScopesAtPos(editor, pos)
  return 'single' if scopes.some((s) -> s.startsWith('string.quoted.single'))
  return 'double' if scopes.some((s) -> s.startsWith('string.quoted.double'))
