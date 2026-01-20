import {Heading, List, Stack} from '@chakra-ui/react';

export function ThereminPrivacyPolicy() {
  return (
    <Stack marginBottom="5em">
      <Heading as="h2">Privacy Policy</Heading>
      <p>
        We are committed to respecting and protecting your privacy.
        This Privacy Notice for Paul M. Christian ("we," "us," or "our"), describes how we collect, use
        and disclose certain information when using our application. By using Theremin,
        you consent to all terms described in this policy, including the collection, use and disclosure of your
        information and usage terms described in 3rd party platforms that we use. We provide periodic updates to this
        policy. It was last updated on November 4, 2025.
      </p>

      <p>
        Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:musicality.computer@gmail.com">musicality.computer@gmail.com</a>.
      </p>

      <Heading as="h3">1. INFORMATION WE COLLECT</Heading>
      <p>
        We use Mixpanel to collect anonymized or aggregate information regarding usage metrics on the Services such as
        user session duration and features used as well as anonymized profile information provided by Meta.
        For information about Mixpanel, please visit <a href="https://mixpanel.com/legal/privacy-policy/">here</a>.
      </p>


      <Heading as="h3">2. HOW WE USE YOUR INFORMATION</Heading>
      <p>
        We use the information we collect on the platform to understand and analyze the usage trends and users' preferences
        etc. to improve our application and develop new features, services and functionality. For example we may use the
        information to monitor aggregate usage metrics to help assess the performance of our application.
        We collect your Meta OrgScopedID, your OculusId (username) and display name via Mixpanel for the purpose of support in the event
        that you are experiencing issues with the application.
      </p>


      <Heading as="h3">3. HOW WE DISCLOSE YOUR INFORMATION</Heading>
      <p>
        We may disclose information to third parties only if you consent to us doing so, as well as in the following
        circumstances:
      </p>
      <List.Root >
        {/*<List.Item>*/}
        {/*  API and Software Development Kits: we may use third party APIs and SDKs as part of the functionality of our*/}
        {/*  Services. APIs and SDKs may allow third parties to collect your information to provide content that is more*/}
        {/*  relevant to you.*/}
        {/*</List.Item>*/}

        <List.Item>
          Pursuant to Legal Requirements: we reserve the right to disclose your information if we believe that we are
          required to do so by law, regulation or legal process such as in response to a court order, subpoena, or similar investigative demand.
        </List.Item>

        <List.Item>
          Merger, Sale or Other Asset Transfers: Information may be disclosed and transferred to an acquirer, successor
          or assignee as part of any merger, acquisition, debt financing, sale of assets, or similar transaction.
        </List.Item>
      </List.Root>


      <Heading as="h3">4. YOUR RIGHTS</Heading>
      <p>
        You can request access to the personal information held about you, update and correct any errors in your personal
        information, and anonymize or delete any of your personal information. If you wish to exercise any of these
        rights, you may contact us at <a href="mailto:musicality.computer@gmail.com">musicality.computer@gmail.com</a>.
      </p>


      <Heading as="h3">5. CHILDREN INFORMATION</Heading>
      <p>
        We are a general audience application not directed to children under the age of 13, and we do not knowingly collect
        personal information from children. If you become aware that your child or any child under your care has provided
        us with information without your consent, please contact us at <a href="mailto:musicality.computer@gmail.com">musicality.computer@gmail.com</a> and we will remove such account or associated information.
      </p>


      <Heading as="h3">6. DATA SECURITY</Heading>
      <p>
        We take steps to ensure that your information is treated securely by adopting reasonable physical, managerial and
        technical safeguards. Please be aware that no security measures are perfect or impenetrable. We cannot ensure or
        warrant the 100% security of any information. To the extent permitted by applicable law, by using Theremin, you agree
        that we may communicate with you regarding security, privacy and administrative issues relating to your use of the
        application.
      </p>


      <Heading as="h3">7. CONTACT INFORMATION</Heading>
      <p>
        If you have any questions, comments, or concerns about this notice, or you would like to exercise your privacy
        rights, please email us at <a href="mailto:musicality.computer@gmail.com">musicality.computer@gmail.com</a>
      </p>
    </Stack>
  );
}