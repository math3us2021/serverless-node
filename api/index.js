const {MongoClient, ObjectId} = require("mongodb");

async function connectToDatabase() {
    const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING)
    console.log('Connecting to database', process.env.MONGODB_CONNECTION_STRING, process.env.MONGODB_DB_NAME)
    const connection = await client.connect()
    return connection.db(process.env.MONGODB_DB_NAME)
}

function extractBody(event) {
    if (!event?.body) {
        return {
            statesCode: 422,
            body: JSON.stringify({error: 'Corpo da mensagem inexiste'})
        }
    }
    return JSON.parse(event.body)
}

module.exports.sendResponse = async (event) => {
    const {name, answers} = extractBody(event)
    const correctQuestions = [3, 1, 0, 2]

    const totalCorrectAnswers = answers.reduce((acc, answer, index) => {
        if (answer === correctQuestions[index]) {
            acc++
        }
        return acc
    }, 0)

    const result = {
        name,
        answers,
        totalCorrectAnswers,
        totalAnswers: answers.length
    }

    const client = await connectToDatabase()
    const collection = await client.collection('results')
    const {insertedId} = await collection.insertOne(result)

    return {
        statusCode: 201,
        body: JSON.stringify({
            resultId: insertedId,
            __hypermedia: {
                href: `/results.html`,
                query: {id: insertedId}
            }
        }),
        headers: {
            'Content-Type': 'application/json',
        }
    }
}

module.exports.getResponse = async (event) => {
    console.log('Get result', event.pathParameters.id)
    const client = await connectToDatabase()
    const collection = await client.collection('results')
    const result = await collection.findOne({
        _id: new ObjectId(event.pathParameters.id)
    })
    if (!result) {
        return {
            statusCode: 404,
            body: JSON.stringify({error: 'Result not found'}),
            headers: {
                'Content-Type': 'application/json',
            }
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {
            'Content-Type': 'application/json',
        }
    }
}


