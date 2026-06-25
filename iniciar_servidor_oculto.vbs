Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set objShell = WScript.CreateObject("WScript.Shell")
objShell.CurrentDirectory = currentDir
objShell.Run "node server.js", 0, False
