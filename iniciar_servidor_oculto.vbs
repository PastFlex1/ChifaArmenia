Set objShell = WScript.CreateObject("WScript.Shell")
objShell.CurrentDirectory = "c:\Users\Alex Palma\Desktop\chifa-pos"
objShell.Run "node server.js", 0, False
