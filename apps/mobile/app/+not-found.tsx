import { Link } from "expo-router";
import { Screen } from "../src/components/Screen";
import { Body, Card, Title } from "../src/components/ui";

export default function NotFound() {
  return (
    <Screen>
      <Card>
        <Title>teñ.</Title>
        <Body>404</Body>
        <Link href="/">Home</Link>
      </Card>
    </Screen>
  );
}
