Remove-Item -Recurse -Force -Path C:\Users\ladav\Documents\GitHub\Memorex\python\static\css
Remove-Item -Recurse -Force -Path C:\Users\ladav\Documents\GitHub\Memorex\python\static\js
Remove-Item -Recurse -Force -Path C:\Users\ladav\Documents\GitHub\Memorex\python\static\index.html
Copy-Item -Recurse -Force -Path C:\Users\ladav\Documents\GitHub\Memorex\memorex-test\build\index.html -Destination C:\Users\ladav\Documents\GitHub\Memorex\python\static\
Copy-Item -Recurse -Force -Path C:\Users\ladav\Documents\GitHub\Memorex\memorex-test\build\static\css -Destination C:\Users\ladav\Documents\GitHub\Memorex\python\static\
Copy-Item -Recurse -Force -Path C:\Users\ladav\Documents\GitHub\Memorex\memorex-test\build\static\js -Destination C:\Users\ladav\Documents\GitHub\Memorex\python\static\