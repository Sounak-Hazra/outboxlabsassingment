import { Client } from "@elastic/elasticsearch";

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

export const setupElasticsearch = async () => {
  const indexName = "emails";
  const indexExists = await esClient.indices.exists({ index: indexName });

  if (!indexExists) {
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          id: { type: "keyword" },
          campaignId: { type: "keyword" },
          userId: { type: "keyword" },
          recipientEmail: { type: "text" },
          subject: { type: "text" },
          status: { type: "keyword" },
          scheduledTime: { type: "date" },
          sentAt: { type: "date" },
        },
      },
    });
    console.log(`Elasticsearch index '${indexName}' created.`);
  }
};