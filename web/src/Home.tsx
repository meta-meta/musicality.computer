import {Box, Card, CardBody, CardHeader, Heading, Link, Text} from "@chakra-ui/react";

export function Home() {
  return (
    <Box textAlign="center" p={10}>
      <Heading color="brand.900">musicality.computer</Heading>

      <Card>
        <CardHeader>A place for the future, in the future.</CardHeader>
        <CardBody>
          <Text>Great stuff coming soon.</Text>
          <br/><br/>
          <Link textDecoration="underline" href="https://meta-meta.github.io/aframe-musicality/">Until then, check out
            the
            legacy site.</Link>
        </CardBody>
      </Card>
    </Box>
  );
}
