import {Box, Card, Flex, Heading, SimpleGrid, Text} from '@chakra-ui/react';
import {useTitle} from './useTitle.tsx';
import {FaWikipediaW} from 'react-icons/fa6';
import ExternalLink, {ExternalLinkProps} from './components/ExternalLink.tsx';


type YouTubeClipProps = {
  title: string;
  description: string;
  src: string;
  links?: ExternalLinkProps[];
  iframeProps?: object;
}

function CardPost({
  title,
  description,
  src,
  links = [],
  iframeProps,
}: YouTubeClipProps) {

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">{title}</Heading>
      </Card.Header>

      <Card.Body p="none" aspectRatio="1/1">
        <iframe
          frameBorder="0"
          height="100%"
          referrerPolicy="strict-origin-when-cross-origin"
          src={src}
          title={title}
          width="100%"
          {...iframeProps}
        />
      </Card.Body>

      <Card.Footer flexDir="column">
        <Text textAlign="left">{description}</Text>

        <Flex gap={2} p={2} flexWrap="wrap">
          {links.map(({label, href, icon}, k) => (
            <ExternalLink
              key={k}
              label={label}
              href={href}
              icon={icon}
            />
          ))}
        </Flex>


      </Card.Footer>
    </Card.Root>
  );
}

function YouTubeClip({
  title,
  description,
  src,
  links = [],
}: YouTubeClipProps) {

  return (
    <CardPost
      title={title}
      description={description}
      src={src}
      links={links}
      iframeProps={{
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowFullScreen: true,
      }}
    />
  );
}

export function VR({pageTitle = 'Musicality VR'}) {
  useTitle(pageTitle);

  return (
    <Box p={2}>
      <Heading color="brand.900" marginBottom={10}>{pageTitle}</Heading>

      <SimpleGrid
        minChildWidth="400px"
        gap={2}
      >

        <YouTubeClip
          title="An afternoon of VR music 10/27 12:30"
          description="A performance of semi-improvised VR music and visuals (minimal/ambient/drone/EJI/ASMR/noise). After the performance, a limited number of volunteers may take turns playing in the virtual environment."
          src="https://www.youtube.com/embed/vf37vyIq6P8?si=a9sek7dexokiiaLm&amp;clip=UgkxHqMHxrwaf1gJlQiptMwP29pPtYWrYsrG&amp;clipt=EAAY4NQD"
          links={[
            {
              label: 'RESOURCE',
              href: 'https://www.resource-mpls.com/calendar',
            },
          ]}
        />

        <YouTubeClip
          title="Chill Sunrise"
          description=""
          src="https://www.youtube.com/embed/Mv2yGQv4Pzc?si=xb6K_9QGrEHnolFy&amp;clip=UgkxFf8pUmElNpFmkK8uQpew_OtM6oao_xPQ&amp;clipt=EKDdogEY0ZemAQ"
          links={[
            {
              label: 'Poi (performance art)',
              href: 'https://en.wikipedia.org/wiki/Poi_(performance_art)',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Ambisonics',
              href: 'https://en.wikipedia.org/wiki/Ambisonics',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Leslie Speaker',
              href: 'https://en.wikipedia.org/wiki/Leslie_speaker',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'IEM DirectivityShaper Guide',
              href: 'https://plugins.iem.at/docs/directivityshaper/',
            },
            {
              label: 'Drone music',
              href: 'https://en.wikipedia.org/wiki/Drone_music',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="ii-V-I with polyrhythm"
          description="Constructing a loop based on the ubiquitous ii-V-I progression in 5-limit JI over a 12/8 bell pattern."
          src="https://www.youtube.com/embed/ClLeOnZ1JL8"
          links={[
            {
              label: 'Bell pattern',
              href: 'https://en.wikipedia.org/wiki/Bell_pattern',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'ii-V-I progression',
              href: 'https://en.wikipedia.org/wiki/Ii%E2%80%93V%E2%80%93I_progression',
              icon: <FaWikipediaW/>,
            },
            {
              label: '5-limit JI Diatonic scale',
              href: 'https://en.wikipedia.org/wiki/Just_intonation#Diatonic_scale',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'xenpaper: ii-V-I',
              href: 'https://xenpaper.com/#%7B1%2F1_9%2F8_5%2F4_4%2F3_3%2F2_5%2F3_15%2F8%7D_%0A%0A%23_C_0__D_1__E_2__F_3__G_4__A_5__B_6%0A%0A0_1_2_3_4_5_6_7%0A%0A%5B9%2F8_4%2F3_5%2F3_1%2F1%5D--%0A%5B3%2F2_15%2F8_9%2F8_4%2F3%5D--%0A%5B1%2F1_5%2F4_3%2F2_15%2F8%5D----%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%0A%23_%5B0_3_5_7%5D----%0A%23_%5B4_6_1_3%5D----%0A%0A%0A%23_%5B1_3_5_0%5D--%0A%23_%5B4_6_1_3%5D--%0A%23_%5B0_2_4_6%5D--%0A%23_%5B0_2_4_5%5D--%0A%0A%0A%23_%5B9%2F8_4%2F3_5%2F3_1%2F1%5D--%0A%23_%5B3%2F2_15%2F8_9%2F8_4%2F3%5D--%0A%23_%5B1%2F1_5%2F4_3%2F2_15%2F8%5D---',
            },
          ]}
        />

        <YouTubeClip
          title="Drone Poi and Ambisonic Tornado Siren"
          description="Engaging with an ambisonic recording of the Minneapolis tornado warning siren test by mixing in some drones. I like my drones to revolve for a more trance-inducing effect, so the organ speakers can be whipped around like poi."
          src="https://www.youtube.com/embed/zeBZWwxzu_E?si=aAajcDYNNkdPppxB&amp;clip=UgkxIC5IxITbmeNzLezikXllh22ISOjiH9zI&amp;clipt=EOCFbBjA2m8"
          links={[
            {
              label: 'Poi (performance art)',
              href: 'https://en.wikipedia.org/wiki/Poi_(performance_art)',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Ambisonics',
              href: 'https://en.wikipedia.org/wiki/Ambisonics',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Hennepin West Mesonet Siren Policy Page',
              href: 'https://www.hennepinwestmesonet.org/en/siren-policy',
            },
            {
              label: 'Drone music',
              href: 'https://en.wikipedia.org/wiki/Drone_music',
              icon: <FaWikipediaW/>,
            },
          ]}
        />


        <YouTubeClip
          title="Sound Bath Shower Head"
          description="Playing a minimal melody by way of rotating a virtual speaker. A drone is directed simultaneously through 4 different band-pass filters which emit audio into the space in separate directions indicated by the colored spheres."
          src="https://www.youtube.com/embed/Mv2yGQv4Pzc?si=SByLtXscXiAecS26&amp;clip=UgkxJRTmKUTgUb3ZTFL89hNzRsvlyiS_SwsL&amp;clipt=EMDWvQIYoKvBAg"
          links={[
            {
              label: 'IEM DirectivityShaper Guide',
              href: 'https://plugins.iem.at/docs/directivityshaper/',
            },
            {
              label: 'Band-pass filter',
              href: 'https://en.wikipedia.org/wiki/Band-pass_filter',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="Drone Poi with DirectivityShaper"
          description="Swinging around a new directivity enhanced poi speaker. Like having a Leslie on a string."
          src="https://www.youtube.com/embed/gBflK6hZBR4?si=s4Jcxr0xgZkkapkK&amp;clip=UgkxI3rGuFeGQGZzdkAgmD3w9mWlrx8ax5-s&amp;clipt=EP7jBRiypAk"
          links={[
            {
              label: 'Poi (performance art)',
              href: 'https://en.wikipedia.org/wiki/Poi_(performance_art)',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Ambisonics',
              href: 'https://en.wikipedia.org/wiki/Ambisonics',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Leslie Speaker',
              href: 'https://en.wikipedia.org/wiki/Leslie_speaker',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'IEM DirectivityShaper Guide',
              href: 'https://plugins.iem.at/docs/directivityshaper/',
            },
            {
              label: 'Drone music',
              href: 'https://en.wikipedia.org/wiki/Drone_music',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="Fractal Jockey"
          description="Improvising on the Lumatone represented by a digital double in VR. MIDI beat clock from REAPER DAW keeps the VR rhythm wheels in sync with a web-based sound toy."
          src="https://www.youtube.com/embed/Qp12mBzXjUw?si=yGSea_9lXCaDXeOG&amp;clip=UgkxnRfCK2fhtLWvXj-B_rgV0bOXpNZeDC7o&amp;clipt=EIT3xAEY5MvIAQ"
        />

        <YouTubeClip
          title="Lumatone Groove"
          description="Improvising on the Lumatone represented by a digital double in VR. MIDI beat clock from REAPER DAW keeps the VR rhythm wheels in sync with a web-based sound toy."
          src="https://www.youtube.com/embed/Qp12mBzXjUw?si=RET3IP0tH9glfuWy&amp;clip=UgkxLd69wPj445U8xTUhT4r9t3838otgVBUv&amp;clipt=EMXyUhilx1Y"
        />

        <YouTubeClip
          title="Finding Chords in the Lattice"
          description="Simultaneously playing chords and analyzing their intervallic content in a harmonic lattice."
          src="https://www.youtube.com/embed/Ad5mJP9gm0s?si=RTuKwepT-TaulEGD&amp;clip=UgkxVb4WEh0PqV3R2LhzCi5zY145p4MOaQ-x&amp;clipt=EOOAOxjyzT4"
        />

        <CardPost
          title="Feedback"
          description={``}
          src="https://docs.google.com/forms/d/e/1FAIpQLSfyuPJSpH3dCAiY13n71VjuzXiPkpz2Dn_E1Uy7h7GMnBUbFg/viewform?embedded=true"
          links={[]}
        />

        <YouTubeClip
          title="Rhythm Wheels"
          description="Perfect for exploring polyrhythmic textures akin to West African rhythm. These wheels are propelled by MIDI beat clock; revolving once per measure, or any ratio of a measure. The mallet balls around the circumference are placed according to the Euclidean Algorithm. (this video in particular is not so polyrhythmic. I'll post another)"
          src="https://www.youtube.com/embed/O-mQpfdVRZA?si=-0rVx_NyMIoIsKj_&amp;clip=UgkxTkz5ytoKDEP9EWGrYmnFRJKmCZg-akbX&amp;clipt=EOWTKBim1Cs"
          links={[
            {
              label: 'Rhythm in Sub-Saharan Africa',
              href: 'https://en.wikipedia.org/wiki/Rhythm_in_Sub-Saharan_Africa',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Euclidean rhythm',
              href: 'https://en.wikipedia.org/wiki/Euclidean_rhythm',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'MIDI beat clock',
              href: 'https://en.wikipedia.org/wiki/MIDI_beat_clock',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="Sine wave Organ with 16 Partials"
          description={`Radial drawbars control the amplitude of a sine wave, the frequency of which is a multiple of a chosen fundamental (420hz), multiplied by the interval of whichever "Tonnegg" is being played (1:1). A "Tonnegg" can be thought of as a reified musical "note". It is perhaps what a note refers to or spells.`}
          src="https://www.youtube.com/embed/LVfwifvShDQ?si=-5AgdxL67dspQi7t&amp;clip=Ugkx7kw64FeKlVrRRXG6n46RfODqBy-cpdtQ&amp;clipt=EM-QBxiv5Qo"
          links={[
            {
              label: 'Additive synthesis',
              href: 'https://en.wikipedia.org/wiki/Additive_synthesis',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Partials',
              href: 'https://en.wikipedia.org/wiki/Harmonic_series_(music)#Partial.2C_harmonic.2C_fundamental.2C_inharmonicity.2C_and_overtone',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Drawbars',
              href: 'https://en.wikipedia.org/wiki/Hammond_organ#Drawbars',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'On Tuning Theory and False Reification by David B. Doty',
              href: 'http://www.dbdoty.com/Words/FalseReification.html',
            },
          ]}
        />

        <YouTubeClip
          title="Cloning Tonneggs and Mallets"
          description={`Tonneggs can be cloned. Using the thumbstick on a VR controller, the cloned tonnegg's interval can be set to some interval from the original, all in one step.`}
          src="https://www.youtube.com/embed/LVfwifvShDQ?si=foF96_zc_sBwRjXa&amp;clip=UgkxIzD3wgD8xTtC4IAqb-cqm8eYPrHGZqm0&amp;clipt=EJ28EBj9kBQ"
          links={[
            {
              label: 'Just Intonation Explained By Kyle Gann',
              href: 'https://www.kylegann.com/tuning.html',
            },
            {
              label: 'Musical Ratios by David B. Doty',
              href: 'https://soundamerican.org/issues/just-intonation/why-how-and-wherefore',
            },
          ]}
        />

        <YouTubeClip
          title="Organ and The Snail"
          description="Radial drawbars provide an isomorphic mapping of the frequency multiplier of each partial. Notice how the energy in the frequency analyzer aligns with the position of the drawbars when the fundamental is tuned to 'C'."
          src="https://www.youtube.com/embed/h6bWy-WI380?si=3Sp2mw7J2G4H-BQB&amp;clip=UgkxuM_fizyqvOxpKoH-kKm2YfxqzCuBcDh7&amp;clipt=EKKfIhiC9CU"
          links={[
            {
              label: 'The Snail by IrcamLab',
              href: 'https://www.ircamlab.com/products/p2242-The-Snail/',
            },
            {
              label: 'Additive synthesis',
              href: 'https://en.wikipedia.org/wiki/Additive_synthesis',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Drawbars',
              href: 'https://en.wikipedia.org/wiki/Hammond_organ#Drawbars',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="Tunable Partials"
          description="The radial drawbars can be dragged from their default harmonic position to create inharmonic overtones. They also have a second drawbar to enable a release envelope. This is a way to explore a range of timbres, including percussive bell sounds."
          src="https://www.youtube.com/embed/h6bWy-WI380?si=WnAfjW0Zx_L45SLO&amp;clip=UgkxhFesIdtC3JkEnc2WWXMMJahCq44thb2Y&amp;clipt=EKGIPhiB3UE"
          links={[
            {
              label: 'The Snail by IrcamLab',
              href: 'https://www.ircamlab.com/products/p2242-The-Snail/',
            },
            {
              label: 'Additive synthesis',
              href: 'https://en.wikipedia.org/wiki/Additive_synthesis',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Inharmonicity',
              href: 'https://en.wikipedia.org/wiki/Inharmonicity',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Envelopes',
              href: 'https://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="Live Jam"
          description="Live jam with my friend apejedi who makes computer music with Supercollider and a custom generative sequencer written in Clojure."
          src="https://www.youtube.com/embed/7eE2k06z-tc?si=RXcDvoASp3AIHbK9&amp;clip=Ugkxfd1L2coI8mtff0uiIrX5nQSxCPkeEMuP&amp;clipt=EMmtwwEYsfzGAQ"
          links={[
            {
              label: 'apejedi SoundCloud',
              href: 'https://soundcloud.com/apejedi',
            },
            {
              label: 'seqr - generative sequencer',
              href: 'https://github.com/jumraiya/seqr',
            },
          ]}
        />

        <YouTubeClip
          title="Theremin Practice"
          description="Theremin is tough!"
          src="https://www.youtube.com/embed/JPKvcLwfadg?si=XyTPmVGqTdEANx8h&amp;clip=UgkxLdc32DU5gayUOuMJNIPXJtmPX1VjThwb&amp;clipt=EL-iJxi-xCo"
          links={[
            {
              label: 'Theremin',
              href: 'https://en.wikipedia.org/wiki/Theremin',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Formant synthesis',
              href: 'https://en.wikipedia.org/wiki/Speech_synthesis#Formant_synthesis',
              icon: <FaWikipediaW/>,
            },
          ]}
        />

        <YouTubeClip
          title="Speaking in Tongues"
          description="Going nuts with a virtual theremin that has a trick up its sleeve: a formant filter controlled by the thumbstick on a VR controller."
          src="https://www.youtube.com/embed/JPKvcLwfadg?si=y_HEBERhwBb8PbiJ&amp;clip=UgkxDLnTcjuZxo0EkWuyN7gnK5bFVdnXfcNj&amp;clipt=ENCDNhiw2Dk"
          links={[
            {
              label: 'Theremin',
              href: 'https://en.wikipedia.org/wiki/Theremin',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Formant synthesis',
              href: 'https://en.wikipedia.org/wiki/Speech_synthesis#Formant_synthesis',
              icon: <FaWikipediaW/>,
            },
          ]}
        />
        <YouTubeClip
          title="Electronic Throat Singing"
          description="Overtone singing with a theremin and formant filter."
          src="https://www.youtube.com/embed/JPKvcLwfadg?si=Ld7R8uvuJSuN3nKx&amp;clip=UgkxKMCb2m6LbviF61QG1SjQsPQFrZ7A855F&amp;clipt=EJn8WBj50Fw"
          links={[
            {
              label: 'Overtone singing',
              href: 'https://en.wikipedia.org/wiki/Overtone_singing',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Theremin',
              href: 'https://en.wikipedia.org/wiki/Theremin',
              icon: <FaWikipediaW/>,
            },
            {
              label: 'Formant synthesis',
              href: 'https://en.wikipedia.org/wiki/Speech_synthesis#Formant_synthesis',
              icon: <FaWikipediaW/>,
            },
          ]}
        />
      </SimpleGrid>


    </Box>
  );


}
