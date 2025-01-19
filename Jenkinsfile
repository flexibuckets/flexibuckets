pipeline {
    agent any
    tools{
        nodejs '22.11'
    }
    stages {
        
        stage('Install Bun') {
            steps {
               sh 'npm install -g bun'
            }
        }
        stage ("git clone"){
            steps{
               git branch: 'main', url: 'https://github.com/flexibuckets/flexibuckets.git'
            }
        }
        stage ('Build'){
            steps{
            sh 'bun install'
            sh 'bun run build'
            }
        }
        
    }
}
